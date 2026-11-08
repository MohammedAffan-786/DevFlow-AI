import mongoose, { Schema, Document } from 'mongoose';

export interface ITestRunDocument extends Document {
  runId: string;
  repositoryId: mongoose.Types.ObjectId;
  repositoryName: string;
  commitSha: string;
  branch: string;
  status: 'PASSED' | 'FAILED' | 'TIMED_OUT' | 'ERROR';
  testConfiguration: {
    framework: string;
    runtime: string;
    cpuLimit: number;
    memoryLimitMb: number;
    timeoutSeconds: number;
    networkDisabled: boolean;
    readonlyRootfs: boolean;
  };
  generatedTestFile: {
    fileName: string;
    filePath: string;
    targetFilePath: string;
    language: string;
    framework: string;
    fullCode: string;
    testCasesCount: number;
  };
  executionEnvironment: {
    runAsUser: string;
    networkMode: string;
    isolationEngine: string;
    seccompProfileApplied: boolean;
  };
  results: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    durationMs: number;
    exitCode: number;
    stdout: string;
    stderr: string;
    errorMessages: string[];
    stackTraces: string[];
    failedAssertions: Array<{
      testName: string;
      expected: string;
      actual: string;
      message: string;
      stackTrace?: string;
    }>;
    coverage?: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
  };
  report: {
    whatWasTested: string[];
    whatPassed: string[];
    whatFailed: string[];
    whyTestsFailed: Array<{
      testName: string;
      reason: string;
      error: string;
    }>;
    suggestedFixes: Array<{
      testName: string;
      fix: string;
      diff: string;
      targetFile: string;
    }>;
    coverageLimitations: string[];
    recommendedAdditionalTests: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const TestRunSchema = new Schema<ITestRunDocument>(
  {
    runId: { type: String, required: true, unique: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    repositoryName: { type: String, required: true },
    commitSha: { type: String, required: true, default: 'HEAD' },
    branch: { type: String, required: true, default: 'main' },
    status: {
      type: String,
      enum: ['PASSED', 'FAILED', 'TIMED_OUT', 'ERROR'],
      required: true,
      default: 'PASSED',
    },
    testConfiguration: {
      framework: { type: String, required: true },
      runtime: { type: String, required: true },
      cpuLimit: { type: Number, default: 1.0 },
      memoryLimitMb: { type: Number, default: 256 },
      timeoutSeconds: { type: Number, default: 15 },
      networkDisabled: { type: Boolean, default: true },
      readonlyRootfs: { type: Boolean, default: true },
    },
    generatedTestFile: {
      fileName: { type: String, required: true },
      filePath: { type: String, required: true },
      targetFilePath: { type: String, required: true },
      language: { type: String, required: true },
      framework: { type: String, required: true },
      fullCode: { type: String, required: true },
      testCasesCount: { type: Number, default: 0 },
    },
    executionEnvironment: {
      runAsUser: { type: String, default: '10001:10001' },
      networkMode: { type: String, default: 'none' },
      isolationEngine: { type: String, default: 'docker' },
      seccompProfileApplied: { type: Boolean, default: true },
    },
    results: {
      totalTests: { type: Number, required: true, default: 0 },
      passedTests: { type: Number, required: true, default: 0 },
      failedTests: { type: Number, required: true, default: 0 },
      skippedTests: { type: Number, default: 0 },
      durationMs: { type: Number, required: true, default: 0 },
      exitCode: { type: Number, default: 0 },
      stdout: { type: String, default: '' },
      stderr: { type: String, default: '' },
      errorMessages: [{ type: String }],
      stackTraces: [{ type: String }],
      failedAssertions: [
        {
          testName: { type: String },
          expected: { type: String },
          actual: { type: String },
          message: { type: String },
          stackTrace: { type: String },
        },
      ],
      coverage: {
        lines: { type: Number, default: 0 },
        branches: { type: Number, default: 0 },
        functions: { type: Number, default: 0 },
        statements: { type: Number, default: 0 },
      },
    },
    report: {
      whatWasTested: [{ type: String }],
      whatPassed: [{ type: String }],
      whatFailed: [{ type: String }],
      whyTestsFailed: [
        {
          testName: { type: String },
          reason: { type: String },
          error: { type: String },
        },
      ],
      suggestedFixes: [
        {
          testName: { type: String },
          fix: { type: String },
          diff: { type: String },
          targetFile: { type: String },
        },
      ],
      coverageLimitations: [{ type: String }],
      recommendedAdditionalTests: [{ type: String }],
    },
  },
  { timestamps: true }
);

TestRunSchema.index({ repositoryId: 1, createdAt: -1 });

export const TestRunModel = mongoose.model<ITestRunDocument>('TestRun', TestRunSchema);
