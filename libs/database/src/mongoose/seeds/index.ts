import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

import { runSeedTask } from '../../seed.runner';
import { seedCrons } from './handlers/cron.seed';

dotenv.config({ path: '../../_env/worker.env' });

const mongoUri = process.env.MONGODB_URI!;

async function runSeeds() {
  console.log('🌱 Initializing Mongo Seed Execution...\n');

  if (!mongoUri) throw new Error('Invalid Mongo DB URI in env');

  await mongoose.connect(mongoUri);
  console.log('Connected to mongo DB for seeding...\n');

  try {
    // Run seed tasks directly without transactions
    await runSeedTask('Cron Schedules', () => seedCrons());

    console.log('🚀 All MongoDB seeds completed successfully!');
  } catch (error) {
    console.error('❌ Mongo Database seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ MongoDatabase connection closed');
  }
}

runSeeds();
