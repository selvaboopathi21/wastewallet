// Seed Script: Populates initial master Admin, Chennai collection Zones, and Rate Card
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../config/env';
import User from '../models/User';
import Zone from '../models/Zone';
import RateCard from '../models/RateCard';
import logger from '../utils/logger';

export const seedDatabase = async () => {
  logger.info('🌱 Starting database seed script...');

  await mongoose.connect(env.mongoUri);
  logger.info('Connected to MongoDB for seeding.');

  // 1. Seed Master Admin User
  const adminPhone = '9999999999';
  const hashedAdminPass = await bcrypt.hash('admin123', 10);
  let admin = await User.findOne({ phone: adminPhone });
  if (!admin) {
    admin = await User.create({
      phone: adminPhone,
      email: 'admin@wastewallet.com',
      name: 'Master Admin',
      role: 'admin',
      password: hashedAdminPass,
      isApproved: true,
      isBlocked: false,
      language: 'en',
    });
    logger.info(`✅ Created Master Admin user with phone: ${adminPhone}`);
  } else {
    admin.role = 'admin';
    admin.email = admin.email || 'admin@wastewallet.com';
    admin.password = hashedAdminPass;
    admin.isApproved = true;
    await admin.save();
    logger.info(`ℹ️ Master Admin user updated with credentials (${adminPhone})`);
  }

  // 2. Seed Default Zones in Chennai
  // Zone A: Anna Nagar & Central Chennai
  const centralZoneCoords = [
    [
      [80.190, 13.060],
      [80.240, 13.060],
      [80.290, 13.080],
      [80.290, 13.130],
      [80.210, 13.130],
      [80.190, 13.060], // Closes polygon
    ],
  ];

  let centralZone = await Zone.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });
  if (!centralZone) {
    centralZone = await Zone.create({
      name: 'Chennai Central (Anna Nagar / Kilpauk)',
      polygon: {
        type: 'Polygon',
        coordinates: centralZoneCoords,
      },
      isActive: true,
    });
    logger.info(`✅ Created Zone: ${centralZone.name}`);
  } else {
    logger.info(`ℹ️ Zone "${centralZone.name}" already exists`);
  }

  // Zone B: South Chennai (Guindy / Adyar / Velachery)
  const southZoneCoords = [
    [
      [80.180, 12.970],
      [80.270, 12.970],
      [80.270, 13.050],
      [80.180, 13.050],
      [80.180, 12.970], // Closes polygon
    ],
  ];

  let southZone = await Zone.findOne({ name: 'Chennai South (Guindy / Adyar)' });
  if (!southZone) {
    southZone = await Zone.create({
      name: 'Chennai South (Guindy / Adyar)',
      polygon: {
        type: 'Polygon',
        coordinates: southZoneCoords,
      },
      isActive: true,
    });
    logger.info(`✅ Created Zone: ${southZone.name}`);
  } else {
    logger.info(`ℹ️ Zone "${southZone.name}" already exists`);
  }

  // 3. Seed Default Scrap Rate Cards (Integer Paise per Kg)
  const defaultRates = [
    { category: 'iron', ratePerKgPaise: 3200 }, // ₹32.00/kg
    { category: 'plastic', ratePerKgPaise: 1800 }, // ₹18.00/kg
    { category: 'copper_wire', ratePerKgPaise: 45000 }, // ₹450.00/kg
    { category: 'paper', ratePerKgPaise: 1200 }, // ₹12.00/kg
    { category: 'ewaste', ratePerKgPaise: 8000 }, // ₹80.00/kg (Special Handling)
    { category: 'battery', ratePerKgPaise: 6500 }, // ₹65.00/kg (Special Handling)
    { category: 'other', ratePerKgPaise: 1000 }, // ₹10.00/kg
    { category: 'mixed', ratePerKgPaise: 1500 }, // ₹15.00/kg (Lower than category avg)
  ];

  for (const item of defaultRates) {
    await RateCard.findOneAndUpdate(
      { category: item.category, zoneId: null },
      {
        category: item.category,
        ratePerKgPaise: item.ratePerKgPaise,
        zoneId: null,
        updatedBy: admin._id,
        effectiveFrom: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`✅ Seeded ${defaultRates.length} standard scrap rate card items in Paise.`);

  // 4. Seed Store Staff User
  const staffPhone = '9876599999';
  const hashedStaffPass = await bcrypt.hash('password123', 10);
  let staff = await User.findOne({ phone: staffPhone });
  if (!staff) {
    staff = await User.create({
      phone: staffPhone,
      email: 'store@wastewallet.com',
      name: 'Store Manager Selvam',
      role: 'store_staff',
      password: hashedStaffPass,
      isApproved: true,
      isBlocked: false,
      language: 'en',
    });
    logger.info(`✅ Created Store Staff user with phone: ${staffPhone}`);
  } else {
    staff.role = 'store_staff';
    staff.email = staff.email || 'store@wastewallet.com';
    staff.password = hashedStaffPass;
    staff.isApproved = true;
    await staff.save();
    logger.info(`ℹ️ Store Staff user updated with credentials (${staffPhone})`);
  }

  // 5. Seed Pre-Configured Test Collector Partner
  const collectorPhone = '9876500001';
  let collector = await User.findOne({ phone: collectorPhone });
  if (collector) {
    collector.email = collector.email || 'collector@wastewallet.com';
    collector.password = await bcrypt.hash('password123', 10);
    collector.isApproved = true;
    await collector.save();
  }

  // 6. Seed Pre-Configured Test Customer
  const customerPhone = '9876543210';
  let customer = await User.findOne({ phone: customerPhone });
  if (customer) {
    customer.name = 'Ravi Kumar';
    customer.email = 'customer@wastewallet.com';
    customer.address = '12, 2nd Avenue, Anna Nagar East, Chennai 600102';
    customer.password = await bcrypt.hash('password123', 10);
    customer.isApproved = true;
    await customer.save();
    logger.info(`ℹ️ Test Customer user updated to Ravi Kumar (${customerPhone})`);
  } else {
    customer = await User.create({
      phone: customerPhone,
      email: 'customer@wastewallet.com',
      name: 'Ravi Kumar',
      role: 'customer',
      password: await bcrypt.hash('password123', 10),
      isApproved: true,
      address: '12, 2nd Avenue, Anna Nagar East, Chennai 600102',
      language: 'en',
    });
    logger.info(`✅ Created Test Customer user: Ravi Kumar (${customerPhone})`);
  }

  // 7. Seed Recycler Buyers for Automatic Material Routing
  const Buyer = (await import('../models/Buyer')).default;
  const defaultBuyers = [
    {
      name: 'Chennai Metal Recyclers Ltd',
      acceptedMaterials: ['iron', 'other'],
      contact: { phone: '9444011111', person: 'Murugesan' },
      location: 'Ambattur Industrial Estate, Chennai',
    },
    {
      name: 'Tamil Nadu Plastic Processing Plant',
      acceptedMaterials: ['plastic', 'mixed'],
      contact: { phone: '9444022222', person: 'Kavitha' },
      location: 'Guindy Industrial Estate, Chennai',
    },
    {
      name: 'Apex Copper Recovery Unit',
      acceptedMaterials: ['copper_wire'],
      contact: { phone: '9444033333', person: 'Suresh' },
      location: 'Sriperumbudur, Tamil Nadu',
    },
    {
      name: 'Eco-Green E-Waste Recyclers',
      acceptedMaterials: ['ewaste'],
      contact: { phone: '9444044444', person: 'Venkatesh' },
      location: 'Maraimalai Nagar, Chennai',
    },
    {
      name: 'VoltPower Battery Safe Recovery',
      acceptedMaterials: ['battery'],
      contact: { phone: '9444055555', person: 'Radha' },
      location: 'Gummidipoondi, Tamil Nadu',
    },
    {
      name: 'South Paper Mill Reclaimers',
      acceptedMaterials: ['paper'],
      contact: { phone: '9444066666', person: 'Manikandan' },
      location: 'Madhavaram, Chennai',
    },
  ];

  for (const b of defaultBuyers) {
    const buyerDoc = await Buyer.findOneAndUpdate(
      { name: b.name },
      { ...b, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Create a User login account for each Buyer company
    const buyerEmail = `${b.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@wastewallet.com`;
    const hashedBuyerPass = await bcrypt.hash('password123', 10);
    await User.findOneAndUpdate(
      { phone: b.contact.phone },
      {
        name: `${b.name} (${b.contact.person})`,
        phone: b.contact.phone,
        email: buyerEmail,
        password: hashedBuyerPass,
        role: 'buyer',
        address: b.location,
        isApproved: true,
        isBlocked: false,
        language: 'en',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`✅ Seeded ${defaultBuyers.length} specialist recycling buyers and corresponding login accounts.`);
  await mongoose.disconnect();
  logger.info('🎉 Seeding completed successfully and database disconnected!\n');
};


// Allow direct CLI execution: npx tsx src/scripts/seed.ts
if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

export default seedDatabase;
