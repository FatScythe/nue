export async function runSeedTask<T>(
  name: string,
  task: () => Promise<T>,
): Promise<T> {
  try {
    console.log(`⏳ Running [${name}] seed...`);
    const result = await task();
    console.log(`✓ [${name}] completed successfully.\n`);
    return result;
  } catch (error) {
    console.error(`❌ [${name}] seeding step failed:`, error);
    throw error;
  }
}
