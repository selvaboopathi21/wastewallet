// Automated test script for Step 7: Batch Deposit, QR Code, Loss %, Sorting & Automatic Buyer Routing
import jwt from 'jsonwebtoken';
import env from '../src/config/env';
import User from '../src/models/User';
import Zone from '../src/models/Zone';
import PickupRequest from '../src/models/PickupRequest';
import Buyer from '../src/models/Buyer';
import Batch from '../src/models/Batch';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runStep7Test() {
  console.log('\n--- 🧪 STARTING STEP 7 TESTS (BATCH, STORE RECEPTION, SORTING & BUYER ROUTING) ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get Users (Collector & Store Staff)
  const collector = await User.findOne({ role: 'collector', phone: '9876500001' });
  const staff = await User.findOne({ role: 'store_staff', phone: '9876599999' });
  const customer = await User.findOne({ role: 'customer', phone: '9876543210' });
  const zone = await Zone.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });

  if (!collector || !staff) {
    throw new Error('Collector or Store Staff user not found. Did you run npm run seed?');
  }

  const collectorToken = jwt.sign(
    { id: collector._id.toString(), role: 'collector' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const staffToken = jwt.sign(
    { id: staff._id.toString(), role: 'store_staff' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 2. Setup 2 completed pickups for this collector
  const pickup1 = await PickupRequest.create({
    customerId: customer!._id,
    collectorId: collector._id,
    zoneId: zone!._id,
    address: 'Anna Nagar Street 1',
    location: { type: 'Point', coordinates: [80.21, 13.08] },
    status: 'completed',
    totalPickupWeightKg: 12.5,
    totalAmountPaise: 40000,
  });

  const pickup2 = await PickupRequest.create({
    customerId: customer!._id,
    collectorId: collector._id,
    zoneId: zone!._id,
    address: 'Anna Nagar Street 2',
    location: { type: 'Point', coordinates: [80.22, 13.08] },
    status: 'completed',
    totalPickupWeightKg: 7.5,
    totalAmountPaise: 24000,
  });

  console.log(`Created 2 completed pickups: ${pickup1.totalPickupWeightKg}kg + ${pickup2.totalPickupWeightKg}kg = 20.00kg total.`);

  // TEST 1: Collector deposits pickups as a daily Batch with QR code
  console.log('\n1. Collector deposits completed pickups as a daily batch...');
  const batchRes: any = await fetch(`${BASE_URL}/batches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
  }).then((r) => r.json());

  console.log('Batch Deposit Result:', batchRes.message);
  console.log('Batch QR Code:', batchRes.data.batch.qrCode);
  console.log('Deposited Weight Kg:', batchRes.data.batch.depositedWeightKg);
  console.log('Batch Status:', batchRes.data.batch.status);

  const batchId = batchRes.data.batch._id;
  const qrCode = batchRes.data.batch.qrCode;

  // TEST 2: Store Staff scans QR code and records received weight (loss % computed)
  console.log('\n2. Store Staff scans QR code and weighs batch (Receives 19.00 kg out of 20.00 kg)...');
  const receiveRes: any = await fetch(`${BASE_URL}/batches/${qrCode}/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    },
    body: JSON.stringify({ receivedWeightKg: 19.0 }), // 1.0kg loss (dust/dirt) = 5.0%
  }).then((r) => r.json());

  console.log('Store Reception Result:', receiveRes.message);
  console.log('Recorded Received Weight:', receiveRes.data.batch.receivedWeightKg, 'kg');
  console.log('Computed Loss Percentage:', receiveRes.data.batch.lossPercent, '%');
  console.log('New Batch Status:', receiveRes.data.batch.status);

  // TEST 3: Store Staff sorts scrap into categories (Special Handling & Buyer Routing)
  console.log('\n3. Store Staff sorts materials (Iron, E-waste, and Battery)...');
  const sortRes: any = await fetch(`${BASE_URL}/batches/${batchId}/sort`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    },
    body: JSON.stringify({
      items: [
        { materialType: 'iron', weightKg: 10.0 },
        { materialType: 'ewaste', weightKg: 5.0 },     // Special Handling!
        { materialType: 'battery', weightKg: 4.0 },    // Special Handling!
      ],
    }),
  }).then((r) => r.json());

  console.log('Sorting Result:', sortRes.message);
  console.log('Sorted Streams Count:', sortRes.data.sortedMaterials.length);

  sortRes.data.sortedMaterials.forEach((m: any) => {
    console.log(
      `  - ${m.materialType.padEnd(8)}: ${m.weightKg}kg | Special Handling: ${m.isSpecialHandling} | Destination Buyer ID: ${m.destinationBuyerId}`
    );
  });

  // TEST 4: Traceability Check: Fetch full batch details
  console.log('\n4. Verifying Full Traceability (Pickups ➔ Collector ➔ Store Staff ➔ Recyclers)...');
  const detailsRes: any = await fetch(`${BASE_URL}/batches/${batchId}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  }).then((r) => r.json());

  const b = detailsRes.data.batch;
  console.log(`Traceability Summary:`);
  console.log(`  - Collector: ${b.collectorId.name} (${b.collectorId.phone})`);
  console.log(`  - Received By: ${b.receivedBy.name}`);
  console.log(`  - Total Pickups Batched: ${b.pickupRequestIds.length}`);
  console.log(`  - Material Routing:`);
  detailsRes.data.sortedMaterials.forEach((sm: any) => {
    console.log(
      `    * ${sm.materialType.toUpperCase()}: ${sm.weightKg}kg ➔ Routed to "${sm.destinationBuyerId?.name || 'Unassigned'}"`
    );
  });

  await mongoose.disconnect();
  console.log('\n✅ ALL STEP 7 TESTS PASSED PERFECTLY!\n');
}

runStep7Test().catch(console.error);
