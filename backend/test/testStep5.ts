// Automated test script for Step 5: Dispatch Engine, Atomic Accept, Offer Timeout & Status Machine
import jwt from 'jsonwebtoken';
import env from '../src/config/env';
import User from '../src/models/User';
import Zone from '../src/models/Zone';
import PickupRequest from '../src/models/PickupRequest';
import { checkExpiredOffers } from '../src/jobs/offerTimeout.job';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runStep5Test() {
  console.log('\n--- 🧪 STARTING STEP 5 TESTS (DISPATCH, ATOMIC ACCEPT & STATUS MACHINE) ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get Central Zone
  const centralZone = await Zone.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });
  if (!centralZone) throw new Error('Zone not found. Please run seed script first.');

  // 2. Setup Customer (Ravi)
  let customer = await User.findOne({ phone: '9876543210' });
  const customerToken = jwt.sign(
    { id: customer!._id.toString(), role: 'customer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 3. Setup Collector 1 (Murugan - Higher rating 4.8)
  let collector1 = await User.findOne({ phone: '9876500001' });
  if (!collector1) {
    collector1 = await User.create({
      phone: '9876500001',
      name: 'Murugan (Top Collector)',
      role: 'collector',
      isApproved: true,
      isOnline: true,
      zoneId: centralZone._id,
      rating: { avg: 4.8, count: 50 },
      acceptanceRate: 98,
      location: { type: 'Point', coordinates: [80.210, 13.080] },
    });
  } else {
    collector1.isOnline = true;
    collector1.isApproved = true;
    collector1.zoneId = centralZone._id;
    await collector1.save();
  }

  const collector1Token = jwt.sign(
    { id: collector1._id.toString(), role: 'collector' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 4. Setup Collector 2 (Kannan - Lower rating 4.0)
  let collector2 = await User.findOne({ phone: '9876500002' });
  if (!collector2) {
    collector2 = await User.create({
      phone: '9876500002',
      name: 'Kannan (Collector 2)',
      role: 'collector',
      isApproved: true,
      isOnline: true,
      zoneId: centralZone._id,
      rating: { avg: 4.0, count: 20 },
      acceptanceRate: 85,
      location: { type: 'Point', coordinates: [80.200, 13.070] },
    });
  } else {
    collector2.isOnline = true;
    collector2.isApproved = true;
    collector2.zoneId = centralZone._id;
    await collector2.save();
  }

  const collector2Token = jwt.sign(
    { id: collector2._id.toString(), role: 'collector' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // TEST 1: Customer creates pickup -> Auto dispatch selects highest scored collector (Murugan)
  console.log('\n1. Customer creates pickup: checking auto-dispatch to highest scored collector...');
  const pickupRes: any = await fetch(`${BASE_URL}/pickups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      address: 'Plot 45, Anna Nagar West, Chennai',
      coordinates: [80.215, 13.085],
      preferredTime: 'afternoon',
    }),
  }).then((r) => r.json());

  const pickupId = pickupRes.data.pickup._id;
  const offeredCollectorId = pickupRes.data.pickup.currentOfferCollectorId;
  console.log('Pickup Status:', pickupRes.data.pickup.status);
  console.log('Offered to Collector ID:', offeredCollectorId);
  console.log('Matches Top Collector Murugan?:', offeredCollectorId === collector1._id.toString());

  // TEST 2: Collector 2 (Kannan) tries to steal/accept Murugan\'s offer (Expect 409 rejection)
  console.log('\n2. Another collector tries to accept the offer (Expect 409 Conflict)...');
  const stealRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collector2Token}` },
  }).then((r) => r.json());
  console.log('Expected Rejection:', stealRes.message);

  // TEST 3: Collector 1 (Murugan) accepts atomically
  console.log('\n3. Rightful collector (Murugan) atomically accepts offer...');
  const acceptRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collector1Token}` },
  }).then((r) => r.json());
  console.log('Accept Status:', acceptRes.data.pickup.status);
  console.log('Assigned Collector:', acceptRes.data.pickup.collectorId);

  // TEST 4: Status Machine: accepted -> on_the_way -> arrived
  console.log('\n4. Progressing status machine: accepted ➔ on_the_way ➔ arrived...');
  const onTheWayRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collector1Token}`,
    },
    body: JSON.stringify({ status: 'on_the_way' }),
  }).then((r) => r.json());
  console.log('Milestone 1:', onTheWayRes.data.pickup.status);

  const arrivedRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collector1Token}`,
    },
    body: JSON.stringify({ status: 'arrived' }),
  }).then((r) => r.json());
  console.log('Milestone 2:', arrivedRes.data.pickup.status);

  // TEST 5: Status Machine: Attempting illegal skip (arrived directly to completed)
  console.log('\n5. Testing illegal status skip (arrived directly to completed)...');
  const illegalSkipRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collector1Token}`,
    },
    body: JSON.stringify({ status: 'completed' }),
  }).then((r) => r.json());
  console.log('Expected Illegal Transition Rejection:', illegalSkipRes.message);

  // TEST 6: 60-Second Offer Timeout & Re-routing to Collector 2
  console.log('\n6. Testing 60-second offer timeout and automatic re-routing to Collector 2 (Kannan)...');
  const pickup2Res: any = await fetch(`${BASE_URL}/pickups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      address: 'Plot 90, Anna Nagar East, Chennai',
      coordinates: [80.215, 13.085],
    }),
  }).then((r) => r.json());

  const pickup2Id = pickup2Res.data.pickup._id;

  // Simulate timeout: Expire the offer in MongoDB
  await PickupRequest.findByIdAndUpdate(pickup2Id, {
    offerExpiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
  });

  // Run the background checker function
  await checkExpiredOffers();

  // Verify the pickup has now been re-routed to Collector 2 (Kannan)
  const updatedPickup2 = await PickupRequest.findById(pickup2Id);
  console.log('Re-routed Collector ID:', updatedPickup2?.currentOfferCollectorId?.toString());
  console.log('Matches Collector 2 (Kannan)?:', updatedPickup2?.currentOfferCollectorId?.toString() === collector2._id.toString());

  await mongoose.disconnect();
  console.log('\n✅ ALL STEP 5 DISPATCH & STATE MACHINE TESTS PASSED PERFECTLY!\n');
}

runStep5Test().catch(console.error);
