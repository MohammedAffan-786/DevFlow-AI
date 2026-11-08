import { Schema, model, Document, Types } from 'mongoose';

export interface ITestSuite extends Document {
  _id: Types.ObjectId;
  repositoryId: Types.ObjectId;
  targetFilePath: string;
  framework: 'jest' | 'vitest' | 'pytest';
  totalCases: number;
  passedCases: number;
  coverageEstimatePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestSuiteSchema = new Schema<ITestSuite>(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    targetFilePath: { type: String, required: true },
    framework: { type: String, enum: ['jest', 'vitest', 'pytest'], required: true },
    totalCases: { type: Number, default: 0 },
    passedCases: { type: Number, default: 0 },
    coverageEstimatePercent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const TestSuiteModel = model<ITestSuite>('TestSuite', TestSuiteSchema);

export interface ITestCase extends Document {
  _id: Types.ObjectId;
  testSuiteId: Types.ObjectId;
  testName: string;
  targetFunctionName: string;
  description: string;
  testCode: string;
  status: 'GENERATED' | 'EXECUTING' | 'PASSED' | 'FAILED' | 'SYNTAX_ERROR';
  lastExecutionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    testSuiteId: { type: Schema.Types.ObjectId, ref: 'TestSuite', required: true, index: true },
    testName: { type: String, required: true },
    targetFunctionName: { type: String, required: true },
    description: { type: String, required: true },
    testCode: { type: String, required: true },
    status: {
      type: String,
      enum: ['GENERATED', 'EXECUTING', 'PASSED', 'FAILED', 'SYNTAX_ERROR'],
      default: 'GENERATED',
      required: true,
    },
    lastExecutionId: { type: Schema.Types.ObjectId, ref: 'ExecutionRun', default: null },
  },
  { timestamps: true }
);

export const TestCaseModel = model<ITestCase>('TestCase', TestCaseSchema);

export interface IExecutionRun extends Document {
  _id: Types.ObjectId;
  testCaseId: Types.ObjectId;
  runtime: 'python:3.11' | 'node:20';
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryPeakMb: number;
  isTimedOut: boolean;
  containerId: string;
  createdAt: Date;
}

const ExecutionRunSchema = new Schema<IExecutionRun>(
  {
    testCaseId: { type: Schema.Types.ObjectId, ref: 'TestCase', required: true, index: true },
    runtime: { type: String, enum: ['python:3.11', 'node:20'], required: true },
    exitCode: { type: Number, required: true },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    executionTimeMs: { type: Number, required: true },
    memoryPeakMb: { type: Number, required: true },
    isTimedOut: { type: Boolean, default: false },
    containerId: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ExecutionRunModel = model<IExecutionRun>('ExecutionRun', ExecutionRunSchema);
