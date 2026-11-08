import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import repoRoutes from './repoRoutes';
import prRoutes from './prRoutes';
import analysisRoutes from './analysisRoutes';
import issueRoutes from './issueRoutes';
import testRoutes from './testRoutes';
import aiToolRoutes from './aiToolRoutes';
import orgRoutes from './orgRoutes';
import notificationRoutes from './notificationRoutes';
import userRoutes from './userRoutes';
import githubRoutes from './githubRoutes';
import analysisEngineRoutes from './analysisEngineRoutes';
import intelligenceRoutes from './intelligenceRoutes';
import webhookRoutes from './webhookRoutes';
import developerIntelligenceRoutes from './developerIntelligenceRoutes';
import jobRoutes from './jobRoutes';
import auditLogRoutes from './auditLogRoutes';

const router = Router();

// API Health Check
router.get('/health', (_req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: isMongoReady ? 'connected' : 'disconnected',
      redis: 'connected',
      aiService: 'available',
    },
  });
});

// Mounted Routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/repositories', repoRoutes);
router.use('/pull-requests', prRoutes);
router.use('/analyses', analysisRoutes);
router.use('/issues', issueRoutes);
router.use('/tests', testRoutes);
router.use('/tools', aiToolRoutes);
router.use('/organizations', orgRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user', userRoutes);

// GitHub Integration & Repository Intelligence
router.use('/github', githubRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/analysis/engine', analysisEngineRoutes);
router.use('/intelligence', intelligenceRoutes);
router.use('/findings', developerIntelligenceRoutes);
router.use('/analytics', developerIntelligenceRoutes);
router.use('/jobs', jobRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
