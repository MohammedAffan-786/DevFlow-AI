import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  AuditLogModel,
  JobRecordModel,
  RepositoryModel,
  AnalysisReportModel,
  IssueModel,
  UserMembershipModel,
  NotificationModel,
  FindingFeedbackModel,
  UserModel,
  PullRequestModel,
  PullRequestReviewModel,
  TestRunModel,
} from '../models';

dotenv.config();

export async function initializeDatabaseIndexes(): Promise<void> {
  console.log('[InitIndexes] Starting database index initialization and optimization...');

  const models = [
    { name: 'AuditLog', model: AuditLogModel },
    { name: 'JobRecord', model: JobRecordModel },
    { name: 'Repository', model: RepositoryModel },
    { name: 'AnalysisReport', model: AnalysisReportModel },
    { name: 'Issue', model: IssueModel },
    { name: 'UserMembership', model: UserMembershipModel },
    { name: 'Notification', model: NotificationModel },
    { name: 'FindingFeedback', model: FindingFeedbackModel },
    { name: 'User', model: UserModel },
    { name: 'PullRequest', model: PullRequestModel },
    { name: 'PullRequestReview', model: PullRequestReviewModel },
    { name: 'TestRun', model: TestRunModel },
  ];

  for (const { name, model } of models) {
    try {
      console.log(`[InitIndexes] Creating indexes for collection "${name}"...`);
      await model.createIndexes();
      const existingIndexes = await model.collection.indexes();
      console.log(`[InitIndexes] ✅ "${name}" successfully indexed (${existingIndexes.length} active indexes).`);
    } catch (err: any) {
      console.warn(`[InitIndexes] Notice for "${name}": ${err.message}`);
    }
  }

  console.log('[InitIndexes] All production database indexes verified.');
}

if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/devflow';
  mongoose.connect(mongoUri).then(async () => {
    await initializeDatabaseIndexes();
    await mongoose.disconnect();
    process.exit(0);
  }).catch((err) => {
    console.error('[InitIndexes] Fatal error:', err);
    process.exit(1);
  });
}
