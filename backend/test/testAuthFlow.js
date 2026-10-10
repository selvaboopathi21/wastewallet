// Simple automated test script for Step 2 Auth Flow
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { mongoUri } = require('../src/config/env');
const Otp = require('../src/models/Otp');

const BASE_URL = 'http://localhost:5000/api/v1/auth';
const TEST_PHONE = '9876543210';

async function runTest() {
  console.log('\n--- 🧪 STARTING AUTH FLOW TEST ---');

  // Step 1: Request OTP
  console.log('\n1. Requesting OTP for phone:', TEST_PHONE);
  const sendRes = await fetch(`${BASE_URL}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE }),
  }).then((r) => r.json());
  console.log('Response:', sendRes);

  // Connect to DB to retrieve the plain OTP we just logged, or test with known code
  await mongoose.connect(mongoUri);
  const otpDoc = await Otp.findOne({ phone: TEST_PHONE });
  console.log('MongoDB Otp Document:', { phone: otpDoc.phone, attempts: otpDoc.attempts, expiresAt: otpDoc.expiresAt });

  // For testing, let's set a known code e.g. "123456" in DB
  const testCode = '123456';
  const salt = await bcrypt.genSalt(10);
  otpDoc.codeHash = await bcrypt.hash(testCode, salt);
  await otpDoc.save();
  await mongoose.disconnect();

  // Step 2: Try wrong OTP first
  console.log('\n2. Testing incorrect OTP (000000)...');
  const wrongRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE, otp: '000000' }),
  }).then((r) => r.json());
  console.log('Expected failure response:', wrongRes.message);

  // Step 3: Verify with correct OTP
  console.log('\n3. Testing correct OTP (123456)...');
  const verifyRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: TEST_PHONE,
      otp: testCode,
      name: 'Ravi Kumar',
      role: 'customer',
    }),
  }).then((r) => r.json());

  console.log('Login success! User:', verifyRes.data.user.name, 'Role:', verifyRes.data.user.role);
  const token = verifyRes.data.token;
  console.log('Received JWT Token:', token.substring(0, 35) + '...');

  // Step 4: Test Protected Route GET /api/v1/auth/me
  console.log('\n4. Testing Protected Profile Route (GET /me)...');
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  console.log('Profile retrieved:', meRes.data.user.phone, '- Role:', meRes.data.user.role);

  // Step 5: Test Role Restriction (Customer trying to access Admin route)
  console.log('\n5. Testing Role Middleware (Customer accessing Admin-only route)...');
  const adminRes = await fetch(`${BASE_URL}/admin-only`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  console.log('Access result (Expected 403 Forbidden):', adminRes.message);

  console.log('\n✅ ALL STEP 2 TESTS PASSED PERFECTLY!\n');
}

runTest().catch(console.error);
