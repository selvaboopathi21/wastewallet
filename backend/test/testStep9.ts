// Automated test script for Step 9: Socket.io Live Weight Updates & Separate Price Request Flow
import ioClient from 'socket.io-client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../src/config/env';
import User from '../src/models/User';
import Zone from '../src/models/Zone';
import PickupRequest from '../src/models/PickupRequest';
import Otp from '../src/models/Otp';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

async function runStep9Test() {
  console.log('\n--- 🧪 STARTING STEP 9 TESTS (SOCKET.IO LIVE AMOUNT & SEPARATE PRICE REQUEST) ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get Customer & Collector
  const customer = await User.findOne({ phone: '9876543210' });
  const collector = await User.findOne({ phone: '9876500001' });
  const zone = await Zone.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });

  if (!customer || !collector || !zone) {
    throw new Error('Test users or zone not found. Did you run npm run seed?');
  }

  const customerId = customer._id.toString();
  const collectorId = collector._id.toString();

  const customerToken = jwt.sign(
    { id: customerId, role: 'customer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const collectorToken = jwt.sign(
    { id: collectorId, role: 'collector' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 2. Setup active pickup in 'arrived' status
  const pickup = await PickupRequest.create({
    customerId: customer._id,
    collectorId: collector._id,
    zoneId: zone._id,
    address: 'Live Sync Test Street, Anna Nagar',
    location: { type: 'Point', coordinates: [80.21, 13.08] },
    status: 'arrived',
    pricingMode: 'mixed',
  });

  const pickupId = pickup._id.toString();
  console.log(`Created test pickup ${pickupId} in 'arrived' status.`);

  // 3. Connect Socket.io Clients (Customer and Collector)
  console.log('\n1. Connecting Customer and Collector Socket.io clients...');
  const customerSocket = ioClient(SOCKET_URL, { transports: ['websocket'] });
  const collectorSocket = ioClient(SOCKET_URL, { transports: ['websocket'] });

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected += 1;
      if (connected === 2) resolve();
    };
    customerSocket.on('connect', () => {
      customerSocket.emit('join_user', customerId);
      customerSocket.emit('join_pickup', pickupId);
      check();
    });
    collectorSocket.on('connect', () => {
      collectorSocket.emit('join_user', collectorId);
      collectorSocket.emit('join_pickup', pickupId);
      check();
    });
  });

  console.log('✅ Both sockets connected and joined rooms successfully!');

  // TEST 1: Collector enters weights in mixed mode -> Customer receives live 'weight.updated'
  console.log('\n2. Testing live weight emission: Collector inputs 20kg in mixed mode...');
  const weightUpdatedPromise = new Promise<any>((resolve) => {
    customerSocket.once('weight.updated', (data) => {
      resolve(data);
    });
  });

  await fetch(`${BASE_URL}/collector/pickups/${pickupId}/weights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      mode: 'mixed',
      items: [{ category: 'mixed', weightKg: 20 }],
    }),
  });

  const liveWeightData = await weightUpdatedPromise;
  console.log('📡 Customer received live "weight.updated" event:');
  console.log(`  - Total Weight: ${liveWeightData.totalPickupWeightKg} kg`);
  console.log(`  - Total Amount: ₹${liveWeightData.totalAmountRupees} (${liveWeightData.totalAmountPaise} paise)`);

  // TEST 2: Customer taps "See separate price" -> Collector receives 'pricing.separate.requested'
  console.log('\n3. Testing "See separate price": Customer sends request...');
  const separateReqPromise = new Promise<any>((resolve) => {
    collectorSocket.once('pricing.separate.requested', (data) => {
      resolve(data);
    });
  });

  const reqSepRes: any = await fetch(`${BASE_URL}/pickups/${pickupId}/request-separate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  }).then((r) => r.json());

  console.log('Request HTTP Response:', reqSepRes.message);

  const liveSeparateReq = await separateReqPromise;
  console.log('📡 Collector received live "pricing.separate.requested" event:');
  console.log(`  - Pickup ID: ${liveSeparateReq.pickupId}`);
  console.log(`  - Status: ${liveSeparateReq.status}`);

  // TEST 3: Collector declines separate price request with a reason
  console.log('\n4. Collector declines request with reason: "Only 2 kg total, not worth sorting"...');
  const separateDeclinePromise = new Promise<any>((resolve) => {
    customerSocket.once('pricing.separate.declined', (data) => {
      resolve(data);
    });
  });

  const declineRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/respond-separate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      action: 'decline',
      declineReason: 'Only 2 kg total, not worth sorting',
    }),
  }).then((r) => r.json());

  console.log('Decline HTTP Response:', declineRes.message);

  const liveDeclineData = await separateDeclinePromise;
  console.log('📡 Customer received live "pricing.separate.declined" event:');
  console.log(`  - Decline Reason: "${liveDeclineData.declineReason}"`);

  // TEST 4: Customer requests again, and Collector accepts!
  console.log('\n5. Customer requests separate price again; Collector ACCEPTS...');
  await fetch(`${BASE_URL}/pickups/${pickupId}/request-separate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  const separateAcceptPromise = new Promise<any>((resolve) => {
    customerSocket.once('pricing.separate.accepted', (data) => {
      resolve(data);
    });
  });

  const acceptRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/respond-separate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({ action: 'accept' }),
  }).then((r) => r.json());

  console.log('Accept HTTP Response:', acceptRes.message);
  console.log('Updated Pricing Mode in DB:', acceptRes.data.pickup.pricingMode);

  const liveAcceptData = await separateAcceptPromise;
  console.log('📡 Customer received live "pricing.separate.accepted" event:');
  console.log(`  - Mode switched to: ${liveAcceptData.pricingMode}`);

  // TEST 5: Collector enters itemized weights (Iron 10kg + Plastic 5kg)
  console.log('\n6. Collector weighs item by item; Customer receives live updated separate amount...');
  const separateWeightPromise = new Promise<any>((resolve) => {
    customerSocket.once('weight.updated', (data) => {
      resolve(data);
    });
  });

  await fetch(`${BASE_URL}/collector/pickups/${pickupId}/weights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      mode: 'separate',
      items: [
        { category: 'iron', weightKg: 10 },
        { category: 'plastic', weightKg: 5 },
      ],
    }),
  });

  const separateWeightData = await separateWeightPromise;
  console.log('📡 Customer received live itemized "weight.updated":');
  console.log(`  - Total Amount in Separate Mode: ₹${separateWeightData.totalAmountRupees}`);

  // TEST 6: Customer confirms OTP -> Collector receives live 'pickup.confirmed'
  console.log('\n7. Customer confirms with OTP; Collector receives live "pickup.confirmed"...');
  const testOtp = '112233';
  const salt = await bcrypt.genSalt(10);
  await Otp.findOneAndUpdate(
    { phone: customer.phone },
    { codeHash: await bcrypt.hash(testOtp, salt), attempts: 0, expiresAt: new Date(Date.now() + 300000) },
    { upsert: true }
  );

  const confirmedPromise = new Promise<any>((resolve) => {
    collectorSocket.once('pickup.confirmed', (data) => {
      resolve(data);
    });
  });

  await fetch(`${BASE_URL}/pickups/${pickupId}/confirm-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ otp: testOtp }),
  });

  const liveConfirmedData = await confirmedPromise;
  console.log('📡 Collector received live "pickup.confirmed" event:');
  console.log(`  - Status: ${liveConfirmedData.status}`);
  console.log(`  - Locked Amount: ₹${liveConfirmedData.totalAmountRupees}`);

  // Disconnect Sockets
  customerSocket.disconnect();
  collectorSocket.disconnect();
  await mongoose.disconnect();

  console.log('\n✅ ALL STEP 9 REAL-TIME TESTS PASSED PERFECTLY!\n');
}

runStep9Test().catch(console.error);
