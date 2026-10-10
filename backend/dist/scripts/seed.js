"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
// Seed Script: Populates initial master Admin, Chennai collection Zones, and Rate Card
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = __importDefault(require("../config/env"));
const User_1 = __importDefault(require("../models/User"));
const Zone_1 = __importDefault(require("../models/Zone"));
const RateCard_1 = __importDefault(require("../models/RateCard"));
const logger_1 = __importDefault(require("../utils/logger"));
const seedDatabase = async () => {
    logger_1.default.info('🌱 Starting database seed script...');
    await mongoose_1.default.connect(env_1.default.mongoUri);
    logger_1.default.info('Connected to MongoDB for seeding.');
    // 1. Seed Master Admin User
    const adminPhone = '9999999999';
    let admin = await User_1.default.findOne({ phone: adminPhone });
    if (!admin) {
        admin = await User_1.default.create({
            phone: adminPhone,
            name: 'Master Admin',
            role: 'admin',
            isApproved: true,
            isBlocked: false,
            language: 'en',
        });
        logger_1.default.info(`✅ Created Master Admin user with phone: ${adminPhone}`);
    }
    else {
        admin.role = 'admin';
        await admin.save();
        logger_1.default.info(`ℹ️ Master Admin user already exists (${adminPhone})`);
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
    let centralZone = await Zone_1.default.findOne({ name: 'Chennai Central (Anna Nagar / Kilpauk)' });
    if (!centralZone) {
        centralZone = await Zone_1.default.create({
            name: 'Chennai Central (Anna Nagar / Kilpauk)',
            polygon: {
                type: 'Polygon',
                coordinates: centralZoneCoords,
            },
            isActive: true,
        });
        logger_1.default.info(`✅ Created Zone: ${centralZone.name}`);
    }
    else {
        logger_1.default.info(`ℹ️ Zone "${centralZone.name}" already exists`);
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
    let southZone = await Zone_1.default.findOne({ name: 'Chennai South (Guindy / Adyar)' });
    if (!southZone) {
        southZone = await Zone_1.default.create({
            name: 'Chennai South (Guindy / Adyar)',
            polygon: {
                type: 'Polygon',
                coordinates: southZoneCoords,
            },
            isActive: true,
        });
        logger_1.default.info(`✅ Created Zone: ${southZone.name}`);
    }
    else {
        logger_1.default.info(`ℹ️ Zone "${southZone.name}" already exists`);
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
        await RateCard_1.default.findOneAndUpdate({ category: item.category, zoneId: null }, {
            category: item.category,
            ratePerKgPaise: item.ratePerKgPaise,
            zoneId: null,
            updatedBy: admin._id,
            effectiveFrom: new Date(),
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }
    logger_1.default.info(`✅ Seeded ${defaultRates.length} standard scrap rate card items in Paise.`);
    await mongoose_1.default.disconnect();
    logger_1.default.info('🎉 Seeding completed successfully and database disconnected!\n');
};
exports.seedDatabase = seedDatabase;
// Allow direct CLI execution: npx tsx src/scripts/seed.ts
if (require.main === module) {
    (0, exports.seedDatabase)().catch((err) => {
        console.error('Seeding failed:', err);
        process.exit(1);
    });
}
exports.default = exports.seedDatabase;
