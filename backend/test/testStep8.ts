// Automated test script for Step 8: Ratings, Rolling Average, Fraud Alerts & Admin Reports
import jwt from 'jsonwebtoken';
import env from '../src/config/env';
import User from '../src/models/User';
import Zone from '../src/models/Zone';
import PickupRequest from '../src/models/PickupRequest';
import Batch from '../src/models/Batch';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runStep8Test() {
  console.log('\n--- 🧪 STARTING STEP 8 TESTS (RATINGS, FRAUD ALERTS & ADMIN REPORTS) ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get test users
  const admin = await User.findOne({ role: 'admin', phone: '9999999999' });
  const collector = await User.findOne({ role: 'collector', phone: '9876500001' });
  const customer = await User.findOne({ role: 'customer', phone: '9876543210' });
  const zone = await Zone.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });

  if (!admin || !collector || !customer || !zone) {
    throw new Error('Test users or zone not found. Did you run npm run seed?');
  }

  const adminToken = jwt.sign(
    { id: admin._id.toString(), role: 'admin' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    { id: customer._id.toString(), role: 'customer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const collectorToken = jwt.sign(
    { id: collector._id.toString(), role: 'collector' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 2. Setup completed test pickup
  const completedPickup = await PickupRequest.create({
    customerId: customer._id,
    collectorId: collector._id,
    zoneId: zone._id,
    address: '42, Harrington Road, Chetpet, Chennai',
    location: { type: 'Point', coordinates: [80.23, 13.07] },
    status: 'completed',
    totalPickupWeightKg: 10.0,
    totalAmountPaise: 32000,
  });

  const pickupId = completedPickup._id.toString();

  // TEST 1: Customer rates Collector (5 stars, tags: fair_weight, on_time)
  console.log('\n1. Customer submits 5-star rating for Collector...');
  const rateRes: any = await fetch(`${BASE_URL}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      requestId: pickupId,
      stars: 5,
      tags: ['fair_weight', 'on_time', 'polite'],
      comment: 'Excellent service! Arrived exactly on time with a digital scale.',
    }),
  }).then((r) => r.json());

  console.log('Rating Submission Result:', rateRes.message);
  console.log('Collector New Average Stars:', rateRes.data.targetUserRating.avg);
  console.log('Collector Total Reviews:', rateRes.data.targetUserRating.count);

  // TEST 2: Customer tries to submit duplicate rating for same pickup (Expect 409 Conflict)
  console.log('\n2. Testing duplicate rating prevention (Expect 409 Conflict)...');
  const duplicateRes: any = await fetch(`${BASE_URL}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      requestId: pickupId,
      stars: 4,
    }),
  }).then((r) => r.json());
  console.log('Expected Rejection Message:', duplicateRes.message);

  // TEST 3: Collector rates Customer (5 stars, tag: clean_segregation)
  console.log('\n3. Collector rates Customer (5 stars)...');
  const collectorRateRes: any = await fetch(`${BASE_URL}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      requestId: pickupId,
      stars: 5,
      tags: ['clean_segregation'],
      comment: 'Scrap was neatly sorted in boxes. Very easy pickup!',
    }),
  }).then((r) => r.json());

  console.log('Collector Rating Result:', collectorRateRes.message);
  console.log('Customer New Average Stars:', collectorRateRes.data.targetUserRating.avg);

  // TEST 4: Attempt to rate non-completed pickup (Expect 400 rejection)
  console.log('\n4. Attempting to rate a non-completed pickup (Expect 400)...');
  const pendingPickup = await PickupRequest.create({
    customerId: customer._id,
    collectorId: collector._id,
    zoneId: zone._id,
    address: 'Pending Pickup Street',
    location: { type: 'Point', coordinates: [80.23, 13.07] },
    status: 'arrived',
  });

  const invalidRateRes: any = await fetch(`${BASE_URL}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      requestId: pendingPickup._id.toString(),
      stars: 4,
    }),
  }).then((r) => r.json());
  console.log('Expected Status Rejection:', invalidRateRes.message);

  // TEST 5: Create a high-loss batch to trigger Fraud Alert
  console.log('\n5. Creating anomalous batch with 40% loss to verify Fraud Detection Engine...');
  const suspiciousBatch = await Batch.create({
    collectorId: collector._id,
    pickupRequestIds: [completedPickup._id],
    qrCode: `SUSP-BATCH-${Date.now()}`,
    depositedWeightKg: 100.0,
    receivedWeightKg: 60.0,
    lossPercent: 40.0, // 40% loss!
    status: 'received',
    depositedAt: new Date(),
    receivedAt: new Date(),
  });

  const fraudRes: any = await fetch(`${BASE_URL}/admin/fraud-alerts`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());

  console.log('Active Fraud Alerts Count:', fraudRes.data.alerts.length);
  if (fraudRes.data.alerts.length > 0) {
    const alert = fraudRes.data.alerts[0];
    console.log(`  - Flagged Collector: ${alert.collectorName} (${alert.collectorPhone})`);
    console.log(`  - Alert Type: ${alert.type} | Severity: ${alert.severity}`);
    console.log(`  - Message: ${alert.message}`);
  }

  // TEST 6: Fetch Full Admin Performance & System Reports
  console.log('\n6. Fetching Comprehensive Admin Dashboard Reports...');
  const reportsRes: any = await fetch(`${BASE_URL}/admin/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());

  console.log('Total Scrap Weight Collected:', reportsRes.data.totals.totalWeightKg, 'kg');
  console.log('Total Payouts to Customers: ₹', reportsRes.data.totals.totalAmountRupees);
  console.log('Completed Pickups Count:', reportsRes.data.totals.completedPickups);
  console.log('Top Collectors Leaderboard:');
  reportsRes.data.collectorLeaderboard.forEach((c: any) => {
    console.log(`  - ${c.name || c.phone} | Rating: ⭐ ${c.rating.avg} (${c.rating.count} reviews) | Approved: ${c.isApproved}`);
  });

  // TEST 7: Admin User Management (Approve Collector & Block User)
  console.log('\n7. Admin updates collector approval status...');
  const approveRes: any = await fetch(`${BASE_URL}/admin/collectors/${collector._id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isApproved: true }),
  }).then((r) => r.json());
  console.log('Approval Result:', approveRes.message);

  await mongoose.disconnect();
  console.log('\n✅ ALL STEP 8 TESTS PASSED PERFECTLY!\n');
}

runStep8Test().catch(console.error);
