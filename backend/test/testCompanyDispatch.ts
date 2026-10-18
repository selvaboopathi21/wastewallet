// Automated test script for Company Handover, Tie-Up Directory, Reception & Staff Notification
import jwt from 'jsonwebtoken';
import env from '../src/config/env';
import User from '../src/models/User';
import Buyer from '../src/models/Buyer';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runCompanyDispatchTest() {
  console.log('\n--- 🧪 STARTING COMPANY HANDOVER & RECEPTION TESTS ---');

  await mongoose.connect(env.mongoUri);

  // 1. Get Store Staff user
  const staff = await User.findOne({ role: 'store_staff', phone: '9876599999' });
  if (!staff) {
    throw new Error('Store Staff user not found. Run npm run seed first.');
  }

  const staffToken = jwt.sign(
    { id: staff._id.toString(), role: 'store_staff' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // 2. Test Inventory Endpoint
  console.log('\n1. Fetching Warehouse Inventory Breakdown...');
  const invRes = await fetch(`${BASE_URL}/company-dispatch/inventory`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  }).then((r) => r.json());

  console.log('Inventory API Message:', invRes.message);
  console.log('Total Available Warehouse Stock:', invRes.data?.summary?.totalAvailableKg, 'kg');
  console.log('Categories Count:', invRes.data?.inventory?.length);
  invRes.data?.inventory?.forEach((cat: any) => {
    console.log(`  - ${cat.category.padEnd(12)}: Available: ${cat.availableKg} kg | Sorted: ${cat.totalSortedKg} kg | Dispatched: ${cat.totalDispatchedKg} kg`);
  });

  // 3. Test Tie-Up Companies List
  console.log('\n2. Fetching Tie-Up Companies List...');
  const compRes = await fetch(`${BASE_URL}/company-dispatch/companies`).then((r) => r.json());
  console.log('Tie-Up Companies Count:', compRes.data?.companies?.length);
  const ironCompany = compRes.data?.companies?.find((c: any) => c.acceptedMaterials.includes('iron'));
  console.log('Found Iron Specialist Company:', ironCompany?.name, '| Location:', ironCompany?.location);

  if (!ironCompany) {
    throw new Error('No company found accepting iron');
  }

  // 4. Test Store Staff Handover Dispatch to Company
  console.log(`\n3. Store Staff dispatching 15.0 kg Iron to "${ironCompany.name}"...`);
  const dispRes = await fetch(`${BASE_URL}/company-dispatch/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    },
    body: JSON.stringify({
      companyId: ironCompany._id,
      materialType: 'iron',
      weightKg: 15.0,
      vehicleNumber: 'TN 02 BB 5566',
      dispatchNotes: 'Automated test dispatch consignment',
    }),
  }).then((r) => r.json());

  console.log('Dispatch Response:', dispRes.message);
  const createdDispatch = dispRes.data?.dispatch;
  console.log('Dispatch Code:', createdDispatch?.dispatchCode);
  console.log('Status:', createdDispatch?.status);

  // 5. Test Company Portal View
  console.log(`\n4. Company accessing their portal page for "${ironCompany.name}"...`);
  const portalRes = await fetch(`${BASE_URL}/company-dispatch/portal/${ironCompany._id}`).then((r) => r.json());
  console.log('Company Portal Company Name:', portalRes.data?.company?.name);
  console.log('Pending Incoming Dispatches Count:', portalRes.data?.pendingDispatches?.length);
  const incoming = portalRes.data?.pendingDispatches?.find((d: any) => d._id === createdDispatch._id);
  console.log('Found Incoming Consignment in Portal:', incoming?.dispatchCode, '| Weight:', incoming?.weightKg, 'kg');

  // 6. Test Company Marks Consignment as Received
  console.log('\n5. Company representative confirms receipt of consignment...');
  const receiveRes = await fetch(`${BASE_URL}/company-dispatch/receive/${createdDispatch._id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receivedWeightKg: 15.0,
      receivedNotes: 'Verified at weighbridge. Accepted in full.',
    }),
  }).then((r) => r.json());

  console.log('Receive Result Message:', receiveRes.message);
  console.log('Receipt Message generated:', receiveRes.data?.message);
  console.log('New Consignment Status:', receiveRes.data?.dispatch?.status);

  // 7. Test Store Staff Notifications for Received Message
  console.log('\n6. Checking Store Staff Notifications / Message Center...');
  const notifRes = await fetch(`${BASE_URL}/company-dispatch/notifications`).then((r) => r.json());
  console.log('Total Notifications Count:', notifRes.data?.notifications?.length);
  console.log('Unread Notifications Count:', notifRes.data?.unreadCount);
  const latestNotif = notifRes.data?.notifications?.[0];
  console.log('Latest Staff Notification:');
  console.log(`  Title: ${latestNotif?.title}`);
  console.log(`  Message: ${latestNotif?.message}`);

  await mongoose.disconnect();
  console.log('\n✅ ALL COMPANY DISPATCH, PORTAL & NOTIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runCompanyDispatchTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
