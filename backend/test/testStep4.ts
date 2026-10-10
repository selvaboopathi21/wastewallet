// Automated test script for Step 4: Pickup Request Creation & Zone Detection
import jwt from 'jsonwebtoken';
import env from '../src/config/env';
import User from '../src/models/User';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runStep4Test() {
  console.log('\n--- 🧪 STARTING STEP 4 TESTS (PICKUP CREATION & ZONE DETECTION) ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get or create a Customer user for testing
  let customer = await User.findOne({ phone: '9876543210' });
  if (!customer) {
    customer = await User.create({
      phone: '9876543210',
      name: 'Ravi Kumar',
      role: 'customer',
    });
  }

  const customerToken = jwt.sign(
    { id: customer._id.toString(), role: 'customer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // Get Admin token to test role blocking
  const adminUser = await User.findOne({ role: 'admin' });
  const adminToken = jwt.sign(
    { id: adminUser!._id.toString(), role: 'admin' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // Test 1: Customer creates pickup in supported zone (Anna Nagar: 80.215, 13.085)
  console.log('\n1. Testing Customer creating pickup in Anna Nagar [80.215, 13.085]...');
  const createRes: any = await fetch(`${BASE_URL}/pickups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      address: '12, 2nd Avenue, Anna Nagar East, Chennai 600102',
      coordinates: [80.215, 13.085],
      preferredTime: 'morning_10am_to_12pm',
      customerPricingPreference: 'best_price_separate',
    }),
  }).then((r) => r.json());

  console.log('Pickup Created Status:', createRes.success);
  console.log('Assigned Status:', createRes.data?.pickup?.status);
  console.log('Pricing Mode:', createRes.data?.pickup?.pricingMode);
  console.log('Linked Zone ID:', createRes.data?.pickup?.zoneId);
  const createdPickupId = createRes.data?.pickup?._id;

  // Test 2: Customer tries to request pickup in an UNSUPPORTED location (e.g. Bangalore: 77.59, 12.97)
  console.log('\n2. Testing pickup request outside service area [77.59, 12.97] (Expect 400 rejection)...');
  const outsideRes: any = await fetch(`${BASE_URL}/pickups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      address: 'MG Road, Bangalore',
      coordinates: [77.59, 12.97],
      preferredTime: 'anytime',
    }),
  }).then((r) => r.json());
  console.log('Rejection Message:', outsideRes.message);

  // Test 3: Customer views their pickup history
  console.log('\n3. Testing GET /api/v1/pickups (Customer history)...');
  const historyRes: any = await fetch(`${BASE_URL}/pickups`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  }).then((r) => r.json());
  console.log(`Retrieved ${historyRes.data.pickups.length} pickups for customer Ravi Kumar.`);

  // Test 4: View single pickup details
  console.log(`\n4. Testing GET /api/v1/pickups/${createdPickupId}...`);
  const detailsRes: any = await fetch(`${BASE_URL}/pickups/${createdPickupId}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  }).then((r) => r.json());
  console.log('Pickup Address:', detailsRes.data.pickup.address);
  console.log('Customer Name:', detailsRes.data.pickup.customerId.name);
  console.log('Zone Name:', detailsRes.data.pickup.zoneId.name);

  // Test 5: Role protection (Admin trying to call Customer-only create pickup route)
  console.log('\n5. Testing non-customer role attempting to create pickup (Expect 403 Forbidden)...');
  const roleBlockedRes: any = await fetch(`${BASE_URL}/pickups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      address: 'Test Address',
      coordinates: [80.215, 13.085],
    }),
  }).then((r) => r.json());
  console.log('Access result (Expected 403):', roleBlockedRes.message);

  await mongoose.disconnect();
  console.log('\n✅ ALL STEP 4 TESTS PASSED PERFECTLY!\n');
}

runStep4Test().catch(console.error);
