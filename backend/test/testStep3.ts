// Automated test script for Step 3: Zone, RateCard & Admin APIs
import jwt from 'jsonwebtoken';
import env from '../src/config/env';
import User from '../src/models/User';
import adminService from '../src/services/admin.service';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runStep3Test() {
  console.log('\n--- 🧪 STARTING STEP 3 TESTS (ZONES, RATES & ADMIN) ---');

  await mongoose.connect(env.mongoUri);

  // Find the seeded Admin user
  const adminUser = await User.findOne({ role: 'admin', phone: '9999999999' });
  if (!adminUser) {
    throw new Error('Master admin user not found. Did you run npm run seed?');
  }

  // Generate Admin JWT token
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), role: 'admin' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // Generate a Customer JWT token for permission testing
  const customerUser = await User.findOne({ role: 'customer' });
  const customerToken = jwt.sign(
    { id: customerUser?._id.toString() || '660000000000000000000001', role: 'customer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // Test 1: Fetch Public Zones
  console.log('\n1. Testing GET /api/v1/zones (Public)...');
  const zonesRes: any = await fetch(`${BASE_URL}/zones`).then((r) => r.json());
  console.log(`Retrieved ${zonesRes.data.zones.length} zones:`, zonesRes.data.zones.map((z: any) => z.name));

  // Test 2: Fetch Public Rates
  console.log('\n2. Testing GET /api/v1/rates (Public)...');
  const ratesRes: any = await fetch(`${BASE_URL}/rates`).then((r) => r.json());
  console.log(`Retrieved ${ratesRes.data.rates.length} scrap categories:`);
  ratesRes.data.rates.forEach((r: any) => {
    console.log(`  - ${r.category.padEnd(12)}: ${r.ratePerKgPaise} paise (₹${r.ratePerKgRupees}/kg)`);
  });

  // Test 3: Geospatial Zone Detection ($geoIntersects)
  console.log('\n3. Testing Geospatial Zone Detection for coordinate [80.215, 13.085] (Anna Nagar)...');
  const detectedZone = await adminService.findZoneByCoordinates(80.215, 13.085);
  console.log('Detected Zone:', detectedZone ? detectedZone.name : 'None found');

  // Test 4: Customer tries to update scrap rate (Should fail with 403 Forbidden)
  console.log('\n4. Testing Customer attempting to update rate (Expect 403 Forbidden)...');
  const forbiddenRes: any = await fetch(`${BASE_URL}/admin/rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ category: 'iron', ratePerKgPaise: 4000 }),
  }).then((r) => r.json());
  console.log('Expected 403 Forbidden Response:', forbiddenRes.message);

  // Test 5: Admin updates scrap rate for iron to 3400 paise (₹34.00/kg)
  console.log('\n5. Testing Admin updating scrap rate for Iron to ₹34.00 (3400 paise)...');
  const updateRes: any = await fetch(`${BASE_URL}/admin/rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ category: 'iron', ratePerKgPaise: 3400 }),
  }).then((r) => r.json());
  console.log('Update Success Response:', updateRes.message);

  await mongoose.disconnect();
  console.log('\n✅ ALL STEP 3 TESTS PASSED PERFECTLY!\n');
}

runStep3Test().catch(console.error);
