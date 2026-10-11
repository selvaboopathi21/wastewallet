// Seed Script: Populates initial master Admin, Chennai collection Zones, and Rate Card
import mongoose from 'mongoose';
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
  let admin = await User.findOne({ phone: adminPhone });
  if (!admin) {
    admin = await User.create({
      phone: adminPhone,
      name: 'Master Admin',
      role: 'admin',
      isApproved: true,
      isBlocked: false,
      language: 'en',
    });
    logger.info(`✅ Created Master Admin user with phone: ${adminPhone}`);
  } else {
    admin.role = 'admin';
    await admin.save();
    logger.info(`ℹ️ Master Admin user already exists (${adminPhone})`);
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
  let staff = await User.findOne({ phone: staffPhone });
  if (!staff) {
    staff = await User.create({
      phone: staffPhone,
      name: 'Store Manager Selvam',
      role: 'store_staff',
      isApproved: true,
      isBlocked: false,
      language: 'en',
    });
    logger.info(`✅ Created Store Staff user with phone: ${staffPhone}`);
  } else {
    staff.role = 'store_staff';
    await staff.save();
  }

  // 5. Seed Recycler Buyers for Automatic Material Routing
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
    await Buyer.findOneAndUpdate(
      { name: b.name },
      { ...b, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`✅ Seeded ${defaultBuyers.length} specialist recycling buyers.`);

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
