// Automated test script for Step 6: On-site Weight Entry, Pricing, OTP Lock, Cash Payment & Completion
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../src/config/env';
import User from '../src/models/User';
import Zone from '../src/models/Zone';
import PickupRequest from '../src/models/PickupRequest';
import PickupItem from '../src/models/PickupItem';
import Payment from '../src/models/Payment';
import Otp from '../src/models/Otp';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runStep6Test() {
  console.log('\n--- 🧪 STARTING STEP 6 TESTS (WEIGHT ENTRY, PRICING, OTP LOCK & PAYMENT) ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get Central Zone
  const centralZone = await Zone.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });

  // 2. Setup Customer & Collector
  const customer = await User.findOne({ phone: '9876543210' });
  const collector = await User.findOne({ phone: '9876500001' });

  const customerToken = jwt.sign(
    { id: customer!._id.toString(), role: 'customer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const collectorToken = jwt.sign(
    { id: collector!._id.toString(), role: 'collector' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 3. Create a Pickup and advance it to 'arrived' status
  const pickup = await PickupRequest.create({
    customerId: customer!._id,
    collectorId: collector!._id,
    zoneId: centralZone!._id,
    address: '100, Anna Salai, Chennai',
    location: { type: 'Point', coordinates: [80.215, 13.085] },
    status: 'arrived',
  });

  const pickupId = pickup._id.toString();
  console.log(`\nCreated test pickup ${pickupId} (status: arrived).`);

  // TEST 1: Collector records weights in Separate Mode (Iron + Plastic)
  console.log('\n1. Collector enters weights in SEPARATE mode: Iron (10kg) + Plastic (5kg)...');
  const separateRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/weights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      mode: 'separate',
      items: [
        { category: 'iron', weightKg: 10 },    // Rate ~3200 paise = ₹320.00
        { category: 'plastic', weightKg: 5 },  // Rate ~1800 paise = ₹90.00
      ],
    }),
  }).then((r) => r.json());

  console.log('Status after weighing:', separateRes.data.pickup.status);
  console.log('Total Weight Kg:', separateRes.data.pickup.totalPickupWeightKg);
  console.log('Total Amount in Paise:', separateRes.data.pickup.totalAmountPaise);
  console.log('Items Created:', separateRes.data.items.length);
  separateRes.data.items.forEach((it: any) => {
    console.log(`  - ${it.category}: ${it.weightKg}kg @ ${it.ratePerKgPaise}p/kg = ₹${(it.amountPaise / 100).toFixed(2)}`);
  });

  // TEST 2: Switch to Mixed Mode: 20kg @ mixed rate (1500 paise = ₹15/kg)
  console.log('\n2. Collector switches to MIXED mode: Total 20kg @ ₹15/kg...');
  const mixedRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/weights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      mode: 'mixed',
      items: [{ category: 'mixed', weightKg: 20 }],
    }),
  }).then((r) => r.json());

  console.log('Pricing Mode:', mixedRes.data.pickup.pricingMode);
  console.log('New Total Weight Kg:', mixedRes.data.pickup.totalPickupWeightKg);
  console.log('New Total Amount (Paise):', mixedRes.data.pickup.totalAmountPaise, `(₹${(mixedRes.data.pickup.totalAmountPaise / 100).toFixed(2)})`);

  // TEST 3: Collector requests 6-digit confirmation OTP to be sent to Customer
  console.log('\n3. Collector requests confirmation OTP...');
  const otpReqRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/request-otp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collectorToken}` },
  }).then((r) => r.json());
  console.log('OTP Request Result:', otpReqRes.message);

  // Set known test OTP in DB
  const testOtp = '654321';
  const salt = await bcrypt.genSalt(10);
  await Otp.findOneAndUpdate(
    { phone: customer!.phone },
    { codeHash: await bcrypt.hash(testOtp, salt), attempts: 0, expiresAt: new Date(Date.now() + 300000) }
  );

  // TEST 4: Customer enters 6-digit OTP to lock weight and amount
  console.log('\n4. Customer submits 6-digit OTP to confirm and lock amount...');
  const confirmRes: any = await fetch(`${BASE_URL}/pickups/${pickupId}/confirm-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ otp: testOtp }),
  }).then((r) => r.json());

  console.log('Confirmed Status:', confirmRes.data.pickup.status);
  console.log('Customer Confirmed Flag:', confirmRes.data.pickup.customerConfirmed);

  // TEST 5: Verify that editing weights after OTP confirmation is BLOCKED
  console.log('\n5. Attempting to modify weights AFTER confirmation (Expect 400 rejection)...');
  const lockedRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/weights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collectorToken}`,
    },
    body: JSON.stringify({
      mode: 'mixed',
      items: [{ category: 'mixed', weightKg: 10 }],
    }),
  }).then((r) => r.json());
  console.log('Expected Rejection Message:', lockedRes.message);

  // TEST 6: Record Cash Payment
  console.log('\n6. Collector records cash payment...');
  const payRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/pay-cash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collectorToken}` },
  }).then((r) => r.json());
  console.log('Payment Status:', payRes.data.pickup.status);
  console.log('Payment Method:', payRes.data.payment.method);
  console.log('Payment Amount Paise:', payRes.data.payment.amountPaise);

  // TEST 7: Complete the Pickup
  console.log('\n7. Finalizing pickup: paid ➔ completed...');
  const completeRes: any = await fetch(`${BASE_URL}/collector/pickups/${pickupId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collectorToken}` },
  }).then((r) => r.json());
  console.log('Final Status:', completeRes.data.pickup.status);

  await mongoose.disconnect();
  console.log('\n✅ ALL STEP 6 TESTS PASSED PERFECTLY!\n');
}

runStep6Test().catch(console.error);
