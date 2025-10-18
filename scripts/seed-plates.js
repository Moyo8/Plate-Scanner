#!/usr/bin/env node
/**
 * Seed MongoDB with sample plates. Designed for manual execution.
 * Usage:
 *   MONGODB_URI="<your connection string>" node scripts/seed-plates.js
 * or create a .env file with MONGODB_URI and run `node scripts/seed-plates.js`.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required. Set it in the environment or .env file.');
  process.exit(1);
}

const PlateSchema = new mongoose.Schema({
  plateNumber: String,
  ownerInfo: {
    name: String,
    phoneNo: String,
  },
  carInfo: {
    model: String,
    color: String,
    category: String,
    expires: Date,
  },
  status: String,
  registeredBy: String,
}, { timestamps: true });

const Plate = mongoose.model('Plate', PlateSchema);

const samplePlates = [
  {
    plateNumber: 'ABC123',
    ownerInfo: { name: 'Dean Winchester', phoneNo: '09125442645' },
    carInfo: { model: 'Chevrolet, Impala 2004', color: 'Black', category: 'Private', expires: '2025-08-01' },
    status: 'Expired',
    registeredBy: 'Admin-01'
  },
  {
    plateNumber: 'ATG193',
    ownerInfo: { name: 'Ruby Chase', phoneNo: '09125442644' },
    carInfo: { model: 'Toyota, Corolla 2023', color: 'Blue', category: 'Public', expires: '2029-03-21' },
    status: 'Valid',
    registeredBy: 'Admin-01'
  },
  {
    plateNumber: 'FGP540',
    ownerInfo: { name: 'Dora Collins', phoneNo: '07126252552' },
    carInfo: { model: 'Mitsubishi, Truck 2019', color: 'Yellow', category: 'Private', expires: '2029-09-30' },
    status: 'Flagged',
    registeredBy: 'Admin-02'
  },
  {
    plateNumber: 'FBA938',
    ownerInfo: { name: 'Barry Allen', phoneNo: '09125442646' },
    carInfo: { model: 'Hyundai, Santa Cruz', color: 'Blue', category: 'Private', expires: '2025-01-19' },
    status: 'Expired',
    registeredBy: 'Admin-01'
  },
  {
    plateNumber: 'SAI007',
    ownerInfo: { name: 'Sultan Afolabi', phoneNo: '08107024470' },
    carInfo: { model: 'BMW, iX1', color: 'Blue', category: 'Private', expires: '2031-06-07' },
    status: 'Valid',
    registeredBy: 'Admin-03'
  },
  {
    plateNumber: 'PHM132',
    ownerInfo: { name: 'Paul Heyman', phoneNo: '0805205519' },
    carInfo: { model: 'Audi, e-tron GT', color: 'Blue', category: 'Public', expires: '2031-01-01' },
    status: 'Valid',
    registeredBy: 'Admin-04'
  },
  {
    plateNumber: 'ELM456',
    ownerInfo: { name: 'Elon Musk', phoneNo: '07055378377' },
    carInfo: { model: 'Tesla, Cybertruck 2024', color: 'Black', category: 'Private', expires: '2034-06-07' },
    status: 'Valid',
    registeredBy: 'Admin-03'
  },
  {
    plateNumber: 'SMD374',
    ownerInfo: { name: 'Seth Mcdonalds', phoneNo: '09153765627' },
    carInfo: { model: 'Mercedes-Benz, GLE-SUV 2025', color: 'Blue', category: 'Private', expires: '2026-08-01' },
    status: 'Valid',
    registeredBy: 'Admin-03'
  },
  {
    plateNumber: 'SWT010',
    ownerInfo: { name: 'Sam Winchester', phoneNo: '08162674283' },
    carInfo: { model: 'Honda, Accord 2011', color: 'Silver', category: 'Private', expires: '2031-04-07' },
    status: 'Valid',
    registeredBy: 'Admin-01'
  },
  {
    plateNumber: 'S010',
    ownerInfo: { name: 'Samuel L. Jackson', phoneNo: '08166373822' },
    carInfo: { model: 'Kia, Rio 2014', color: 'Silver', category: 'Private', expires: '2031-02-07' },
    status: 'Flagged',
    registeredBy: 'Admin-01'
  }
];

async function main() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
    });
    console.log('Connected to MongoDB');

    const existingCount = await Plate.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} plates already in the collection. No changes made.`);
      return;
    }
    const result = await Plate.insertMany(samplePlates);
    console.log(`Seeded ${result.length} plates.`);
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
