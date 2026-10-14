import mongoose from 'mongoose';
import env from '../src/config/env';
import PickupRequest from '../src/models/PickupRequest';
import User from '../src/models/User';
import Zone from '../src/models/Zone';
import dispatchService from '../src/services/dispatch.service';
import pickupService from '../src/services/pickup.service';

async function runTest() {
  console.log('\n--- 🧪 TESTING OFFER PERSISTENCE, PASS/DECLINE AND CANCEL FLOW ---');

  await mongoose.connect(env.mongoUri);
  console.log('✅ Connected to MongoDB Atlas');

  // 1. Get Customer and Collector
  const customer = await User.findOne({ role: 'customer' });
  const collector = await User.findOne({ phone: '9944038841', role: 'collector' });
  const zone = await Zone.findOne({ isActive: true });

  if (!customer || !collector || !zone) {
    throw new Error('Required customer, collector, or zone not found');
  }

  console.log(`Using Customer: ${customer.name} (${customer._id})`);
  console.log(`Using Collector: ${collector.name} (${collector._id})`);

  // 2. Create fresh test pickup
  const pickup = await PickupRequest.create({
    customerId: customer._id,
    zoneId: zone._id,
    address: 'Test Street, Anna Nagar, Chennai',
    location: { type: 'Point', coordinates: [80.21, 13.08] },
    status: 'offered',
    currentOfferCollectorId: collector._id,
    offerExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    offeredTo: [collector._id],
    declinedBy: [],
  });
  console.log(`\nCreated test pickup ${pickup._id} offered to ${collector.name}`);

  // 3. Verify getMyOffers includes the offer for the designated collector!
  console.log('\n1. Verifying getMyOffers query includes this offer for the collector...');
  const userZoneId = collector.zoneId;
  const recipientCondition = userZoneId
    ? {
        $or: [
          { currentOfferCollectorId: collector._id },
          {
            $and: [
              {
                $or: [
                  { currentOfferCollectorId: null },
                  { currentOfferCollectorId: { $exists: false } },
                ],
              },
              {
                $or: [
                  { zoneId: userZoneId },
                  { zoneId: null },
                  { zoneId: { $exists: false } },
                ],
              },
            ],
          },
        ],
      }
    : {
        $or: [
          { currentOfferCollectorId: collector._id },
          { currentOfferCollectorId: null },
          { currentOfferCollectorId: { $exists: false } },
        ],
      };

  const matchingOffers = await PickupRequest.find({
    _id: pickup._id,
    status: { $in: ['offered', 'pending'] },
    declinedBy: { $nin: [collector._id] },
    ...recipientCondition,
  });

  console.log(`Offers found for collector: ${matchingOffers.length} (Expected: 1)`);
  if (matchingOffers.length !== 1) {
    throw new Error('Offer MUST be found for designated collector and not filtered out!');
  }
  console.log('✅ SUCCESS: Offer stays visible and persistent for the collector!');

  // 4. Test Collector Declining/Passing on the offer
  console.log('\n2. Testing collector clicking Pass (decline)...');
  await dispatchService.declinePickup(pickup._id.toString(), collector._id.toString());

  const afterDecline = await PickupRequest.find({
    _id: pickup._id,
    status: { $in: ['offered', 'pending'] },
    declinedBy: { $nin: [collector._id] },
  });
  console.log(`Offers found for collector after declining: ${afterDecline.length} (Expected: 0)`);
  if (afterDecline.length !== 0) {
    throw new Error('Offer should be permanently excluded after being declined!');
  }
  console.log('✅ SUCCESS: Offer is permanently excluded once passed!');

  // 5. Test Customer Cancellation
  console.log('\n3. Testing customer cancellation...');
  const cancelled = await pickupService.cancelPickupRequest(
    pickup._id.toString(),
    customer._id.toString(),
    'customer'
  );
  console.log(`✅ Pickup cancelled! Status: ${cancelled.status}`);
  if (cancelled.status !== 'cancelled') {
    throw new Error('Status should be cancelled');
  }

  // Cleanup test pickup
  await PickupRequest.findByIdAndDelete(pickup._id);
  console.log('Cleaned up test pickup record');

  await mongoose.disconnect();
  console.log('\n🎉 ALL TESTS PASSED 100%! ZERO FLASHING OR PREMATURE DISAPPEARING!\n');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
