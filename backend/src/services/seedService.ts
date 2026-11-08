import { UserModel } from '../models/User';
import { OrganizationModel } from '../models/Organization';
import { UserMembershipModel } from '../models/UserMembership';
import { RepositoryModel } from '../models/Repository';
import { PullRequestModel } from '../models/PullRequest';
import { AnalysisRunModel } from '../models/AnalysisRun';
import { IssueModel } from '../models/Issue';
import { TestSuiteModel, TestCaseModel, ExecutionRunModel } from '../models/TestSuite';
import { NotificationModel } from '../models/Notification';
import { AuthService } from './authService';

export class SeedService {
  static async seedIfEmpty() {
    const userCount = await UserModel.countDocuments();
    if (userCount > 0) {
      return;
    }

    console.log('[DevFlow Seed] Seeding initial production data and demonstration records...');

    // 1. Seed Demo User
    const passwordHash = AuthService.hashPassword('Password123!');
    const demoUser = await UserModel.create({
      email: 'alex.dev@acme.com',
      username: 'alexdev',
      displayName: 'Alex Mercer',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'SYSTEM_ADMIN',
      isEmailVerified: true,
      lastLoginAt: new Date(),
    });

    // 2. Seed Default Organization
    const acmeOrg = await OrganizationModel.create({
      name: 'Acme Cloud Technologies',
      slug: 'acme-corp',
      billingEmail: 'billing@acme.com',
      plan: 'PRO',
      limits: {
        maxRepositories: 50,
        maxMonthlyScans: 2500,
        maxConcurrentSandboxes: 8,
      },
    });

    // 3. User Membership
    await UserMembershipModel.create({
      userId: demoUser._id,
      organizationId: acmeOrg._id,
      role: 'OWNER',
    });

    // 4. Seed Repositories
    const paymentRepo = await RepositoryModel.create({
      organizationId: acmeOrg._id,
      githubRepoId: 8941201,
      name: 'payment-gateway',
      fullName: 'acme/payment-gateway',
      htmlUrl: 'https://github.com/acme/payment-gateway',
      defaultBranch: 'main',
      isPrivate: true,
      primaryLanguage: 'TypeScript',
      healthScore: 94,
      lastScannedAt: new Date(),
    });

    const authRepo = await RepositoryModel.create({
      organizationId: acmeOrg._id,
      githubRepoId: 8941202,
      name: 'auth-service',
      fullName: 'acme/auth-service',
      htmlUrl: 'https://github.com/acme/auth-service',
      defaultBranch: 'main',
      isPrivate: true,
      primaryLanguage: 'Python',
      healthScore: 88,
      lastScannedAt: new Date(Date.now() - 3600000 * 4),
    });

    const analyticsRepo = await RepositoryModel.create({
      organizationId: acmeOrg._id,
      githubRepoId: 8941203,
      name: 'analytics-pipeline',
      fullName: 'acme/analytics-pipeline',
      htmlUrl: 'https://github.com/acme/analytics-pipeline',
      defaultBranch: 'main',
      isPrivate: false,
      primaryLanguage: 'TypeScript',
      healthScore: 91,
      lastScannedAt: new Date(Date.now() - 3600000 * 24),
    });

    // 5. Seed Pull Requests
    const pr1 = await PullRequestModel.create({
      repositoryId: paymentRepo._id,
      prNumber: 142,
      title: 'feat: add Stripe v3 idempotency keys & automatic webhook retries',
      headSha: 'a4b82f1',
      baseSha: '89f10e4',
      headBranch: 'feature/stripe-v3',
      baseBranch: 'main',
      state: 'OPEN',
      authorUsername: 'alexdev',
      authorAvatarUrl: demoUser.avatarUrl,
      changedFilesCount: 6,
      additions: 245,
      deletions: 38,
    });

    const pr2 = await PullRequestModel.create({
      repositoryId: authRepo._id,
      prNumber: 89,
      title: 'security: upgrade token rotation algorithm to RFC 6749 standard',
      headSha: '7f912c0',
      baseSha: '12d88f9',
      headBranch: 'security/token-rotation',
      baseBranch: 'main',
      state: 'OPEN',
      authorUsername: 'sarah_sec',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      changedFilesCount: 3,
      additions: 89,
      deletions: 14,
    });

    // 6. Seed Analysis Runs
    const analysisRun1 = await AnalysisRunModel.create({
      repositoryId: paymentRepo._id,
      pullRequestId: pr1._id,
      trigger: 'WEBHOOK_PR',
      status: 'COMPLETED',
      commitSha: 'a4b82f190bc',
      branch: 'feature/stripe-v3',
      metrics: {
        bugsFound: 1,
        vulnerabilitiesFound: 1,
        codeSmellsFound: 3,
        securityCriticalCount: 0,
        qualityScore: 92,
        cyclomaticComplexityAvg: 3.4,
      },
      durationMs: 4200,
      tokenUsage: { totalTokens: 3840, estimatedCostUsd: 0.019 },
    });

    pr1.latestAnalysisRunId = analysisRun1._id;
    await pr1.save();

    // 7. Seed Issues (Bugs, Security Vulnerabilities, Code Smells)
    await IssueModel.create([
      {
        analysisRunId: analysisRun1._id,
        repositoryId: paymentRepo._id,
        pullRequestId: pr1._id,
        type: 'SECURITY_VULNERABILITY',
        severity: 'HIGH',
        status: 'OPEN',
        title: 'Unescaped User Parameter in Dynamic Database Query',
        description: 'Direct string concatenation in the account lookup method creates a potential SQL injection vulnerability if input sanitization is bypassed.',
        location: {
          filePath: 'src/services/billingService.ts',
          startLine: 48,
          endLine: 50,
          snippet: "const account = await db.query(`SELECT * FROM customers WHERE external_id = '${customerId}'`);",
        },
        cweId: 'CWE-89',
        owaspCategory: 'A03:2021-Injection',
        suggestedFixDiff: "@@ -48,3 +48,3 @@\n-const account = await db.query(`SELECT * FROM customers WHERE external_id = '${customerId}'`);\n+const account = await db.query('SELECT * FROM customers WHERE external_id = $1', [customerId]);",
        suggestedFixExplanation: 'Utilize parameterized queries with typed parameter bindings rather than inline string interpolation.',
        fingerprint: 'fp_cwe89_billingService_48',
      },
      {
        analysisRunId: analysisRun1._id,
        repositoryId: paymentRepo._id,
        pullRequestId: pr1._id,
        type: 'BUG',
        severity: 'MEDIUM',
        status: 'OPEN',
        title: 'Unhandled Promise Rejection on Webhook Timeout',
        description: 'Calling external Stripe verification endpoint inside asynchronous promise handler without wrapping in try/catch block will crash worker on network timeout.',
        location: {
          filePath: 'src/webhooks/stripeDispatcher.ts',
          startLine: 82,
          endLine: 86,
          snippet: 'const verifiedEvent = await stripe.webhooks.constructEventAsync(payload, sig, secret);\nprocessEvent(verifiedEvent);',
        },
        cweId: 'CWE-755',
        owaspCategory: 'A04:2021-Insecure-Design',
        suggestedFixDiff: "@@ -82,3 +82,7 @@\n-const verifiedEvent = await stripe.webhooks.constructEventAsync(payload, sig, secret);\n+try {\n+  const verifiedEvent = await stripe.webhooks.constructEventAsync(payload, sig, secret);\n+} catch (err) {\n+  logger.error('Signature verification failed', err);\n+  return res.status(400).send('Invalid webhook signature');\n+}",
        suggestedFixExplanation: 'Encapsulate asynchronous webhook constructor call in a structured try/catch block with explicit HTTP 400 error return.',
        fingerprint: 'fp_bug_webhookDispatcher_82',
      },
      {
        analysisRunId: analysisRun1._id,
        repositoryId: paymentRepo._id,
        pullRequestId: pr1._id,
        type: 'CODE_SMELL',
        severity: 'LOW',
        status: 'OPEN',
        title: 'Cognitive Complexity Threshold Exceeded',
        description: 'Function `processPaymentIntent` contains 7 nested condition blocks, making test coverage brittle and increasing maintenance overhead.',
        location: {
          filePath: 'src/handlers/paymentIntent.ts',
          startLine: 15,
          endLine: 65,
          snippet: 'export async function processPaymentIntent(intent: PaymentIntent) { ... }',
        },
        suggestedFixDiff: 'Extract intermediate status handlers into discrete strategy functions: `handleSucceededIntent`, `handleFailedIntent`.',
        suggestedFixExplanation: 'Refactor using the State or Strategy pattern to reduce cyclomatic complexity from 14 to 3.',
        fingerprint: 'fp_smell_paymentIntent_15',
      },
    ]);

    // 8. Seed Test Suites & Test Cases
    const testSuite = await TestSuiteModel.create({
      repositoryId: paymentRepo._id,
      targetFilePath: 'src/services/billingService.ts',
      framework: 'vitest',
      totalCases: 4,
      passedCases: 4,
      coverageEstimatePercent: 96,
    });

    const testCase = await TestCaseModel.create({
      testSuiteId: testSuite._id,
      testName: 'should correctly compute prorated refund on subscription cancellation mid-cycle',
      targetFunctionName: 'calculateProration',
      description: 'Verifies exact millisecond date differential arithmetic against 30-day billing cycle boundary.',
      testCode: `import { describe, it, expect } from 'vitest';\nimport { calculateProration } from './billingService';\n\ndescribe('calculateProration', () => {\n  it('prorates 15 remaining days accurately', () => {\n    const refund = calculateProration({ planPrice: 100, daysUsed: 15, totalDays: 30 });\n    expect(refund).toBe(50.00);\n  });\n});`,
      status: 'PASSED',
    });

    const executionRun = await ExecutionRunModel.create({
      testCaseId: testCase._id,
      runtime: 'node:20',
      exitCode: 0,
      stdout: '✓ calculateProration > prorates 15 remaining days accurately (4ms)\n\nTest Files  1 passed (1)\nTests  1 passed (1)\nDuration  128ms',
      stderr: '',
      executionTimeMs: 128,
      memoryPeakMb: 62,
      isTimedOut: false,
      containerId: 'sandbox_c89140fa',
    });

    testCase.lastExecutionId = executionRun._id;
    await testCase.save();

    // 9. Seed Notifications
    await NotificationModel.create([
      {
        userId: demoUser._id,
        organizationId: acmeOrg._id,
        type: 'SECURITY_ALERT',
        title: 'High Severity Security Finding in PR #142',
        message: 'Unescaped SQL query detected in src/services/billingService.ts. Automated fix patch generated.',
        link: '/repositories/' + paymentRepo._id + '/security',
        isRead: false,
      },
      {
        userId: demoUser._id,
        organizationId: acmeOrg._id,
        type: 'SCAN_COMPLETED',
        title: 'Repository Scan Completed: acme/payment-gateway',
        message: 'Scan finished in 4.2s with quality score 94/100.',
        link: '/history',
        isRead: true,
      },
    ]);

    console.log('[DevFlow Seed] Initial data successfully seeded! Demo user: alex.dev@acme.com / Password123!');
  }
}
