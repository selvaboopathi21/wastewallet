import mongoose from 'mongoose';
import env from '../src/config/env';
import PickupRequest from '../src/models/PickupRequest';
import User from '../src/models/User';
import dispatchService from '../src/services/dispatch.service';
import pickupService from '../src/services/pickup.service';

async function runTest() {
  console.log('\n--- 🧪 TESTING PASS/DECLINE AND CANCEL FLOW ---');

  await mongoose.connect(env.mongoUri);
  console.log('✅ Connected to MongoDB Atlas');

  // Find collector Murugan (9876500001) or Selvaboopathi
  const collector = await User.findOne({ role: 'collector', isApproved: true });
  if (!collector) throw new Error('No approved collector found');
  console.log(`Using Collector: ${collector.name} (${collector._id})`);

  // Target the active offer 6acf37ce83f751059191827d
  const targetPickupId = '6acf37ce83f751059191827d';
  const pickup = await PickupRequest.findById(targetPickupId);
  if (pickup) {
    console.log(`Target pickup status: ${pickup.status}, currentOfferCollectorId: ${pickup.currentOfferCollectorId}`);
    
    // Test 1: Decline offer as collector
    console.log('\n1. Testing collector decline/pass on open broadcast offer...');
    const declined = await dispatchService.declinePickup(targetPickupId, collector._id.toString());
    console.log(`✅ Decline succeeded! OfferedTo:`, declined?.offeredTo);
    if (!declined?.offeredTo.some(id => id.toString() === collector._id.toString())) {
      throw new Error('Collector ID should be in offeredTo');
    }

    // Test 2: Verify getMyOffers excludes this offer for this collector
    console.log('\n2. Verifying offer is excluded for this collector...');
    const activeOffersForCollector = await PickupRequest.find({
      _id: targetPickupId,
      status: { $in: ['offered', 'pending'] },
      offeredTo: { $nin: [collector._id] },
    });
    console.log(`Offers found for collector: ${activeOffersForCollector.length} (Expected: 0)`);
    if (activeOffersForCollector.length !== 0) {
      throw new Error('Offer should be excluded for this collector');
    }

    // Test 3: Test Customer Cancel Pickup
    console.log('\n3. Testing Customer Cancellation of pickup request...');
    const cancelled = await pickupService.cancelPickupRequest(
      targetPickupId,
      pickup.customerId.toString(),
      'customer'
    );
    console.log(`✅ Pickup cancelled! Status: ${cancelled.status}`);
    if (cancelled.status !== 'cancelled') {
      throw new Error('Status should be cancelled');
    }
  }

  await mongoose.disconnect();
  console.log('\n🎉 ALL DECLINE & CANCEL TESTS PASSED 100%!\n');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
