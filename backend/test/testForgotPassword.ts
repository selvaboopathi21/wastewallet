import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app';
import env from '../src/config/env';
import User from '../src/models/User';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1/auth`;

async function runTest() {
  console.log('\n--- 🧪 STARTING FORGOT PASSWORD AUTOMATED TEST ---');

  await mongoose.connect(env.mongoUri);
  console.log('✅ Connected to MongoDB Atlas');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`✅ Test server listening on port ${TEST_PORT}`);

  try {
    const testPhone = '9876543210';
    const user = await User.findOne({ phone: testPhone }).select('+password');
    if (!user) {
      throw new Error('Test user not found');
    }
    const originalPassword = user.password;
    console.log(`Target test user: ${user.name} (${user.phone}, role: ${user.role})`);

    // Test 1: Request reset with non-existent phone
    console.log('\n1. Testing forgot-password with non-existent phone (0000000000)...');
    const res1 = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '0000000000' }),
    });
    const data1: any = await res1.json();
    console.log(`Status: ${res1.status}, Error:`, data1.message);
    if (res1.status !== 404) throw new Error('Expected 404 for non-existent identifier');

    // Test 2: Request reset with valid phone
    console.log('\n2. Testing forgot-password with valid phone...');
    const res2 = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testPhone }),
    });
    const data2: any = await res2.json();
    console.log(`Status: ${res2.status}, Success: ${data2.success}, Phone: ${data2.data?.phone}`);
    if (res2.status !== 200 || !data2.data?.otp) throw new Error('Expected 200 with OTP');
    const generatedOtp = data2.data.otp;
    console.log('Received OTP:', generatedOtp);

    // Test 3: Reset password with wrong OTP
    console.log('\n3. Testing reset-password with invalid OTP (000000)...');
    const res3 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        otp: '000000',
        newPassword: 'newsecurepassword123',
      }),
    });
    const data3: any = await res3.json();
    console.log(`Status: ${res3.status}, Error:`, data3.message);
    if (res3.status !== 400) throw new Error('Expected 400 for invalid OTP');

    // Test 4: Reset password with short password (< 6 chars)
    console.log('\n4. Testing reset-password with password < 6 chars...');
    const res4 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        otp: generatedOtp,
        newPassword: '123',
      }),
    });
    const data4: any = await res4.json();
    console.log(`Status: ${res4.status}, Error:`, data4.message);
    if (res4.status !== 400) throw new Error('Expected 400 for short password');

    // Test 5: Successfully reset password with valid OTP and new password
    console.log('\n5. Testing reset-password with correct OTP and valid new password...');
    const tempPassword = 'TemporaryNewPassword2026!';
    const res5 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        otp: generatedOtp,
        newPassword: tempPassword,
      }),
    });
    const data5: any = await res5.json();
    console.log(`Status: ${res5.status}, Success: ${data5.success}, User: ${data5.data?.user?.name}`);
    if (res5.status !== 200 || !data5.data?.token) throw new Error('Expected 200 with JWT token');

    // Test 6: Verify login with new password
    console.log('\n6. Verifying password login with the new password...');
    const res6 = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testPhone,
        password: tempPassword,
      }),
    });
    const data6: any = await res6.json();
    console.log(`Status: ${res6.status}, Logged In User: ${data6.data?.user?.name}`);
    if (res6.status !== 200) throw new Error('Login with new password failed');

    // Restore original password so test user account state is unaffected
    console.log('\n7. Restoring original password in database...');
    await User.updateOne({ phone: testPhone }, { $set: { password: originalPassword } });
    console.log('✅ Original user credentials restored perfectly');

    console.log('\n🎉 ALL FORGOT PASSWORD AUTOMATED TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
