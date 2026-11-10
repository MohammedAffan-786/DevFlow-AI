import mongoose from 'mongoose';

export async function initializeDatabaseIndexes(): Promise<void> {
  const modelNames = mongoose.modelNames();
  await Promise.all(modelNames.map((name) => mongoose.model(name).createIndexes()));
}
