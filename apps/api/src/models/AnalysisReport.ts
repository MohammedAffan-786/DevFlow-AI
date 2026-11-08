import mongoose, { Schema, Document } from 'mongoose';

// ─── Sub-document schemas ────────────────────────────────────────────────────

const FindingSchema = new Schema(
  {
    findingId: { type: String, required: true },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    explanation: { type: String, required: true },
    whyItMatters: { type: String, required: true },
    suggestedFix: { type: String, required: true },
    correctedCodeExample: { type: String },
    confidenceScore: { type: Number, min: 0, max: 1, required: true },
    evidenceStatus: {
      type: String,
      enum: ['CONFIRMED', 'LIKELY', 'POSSIBLE', 'INSUFFICIENT_EVIDENCE'],
      required: true,
    },
    codeSnippet: { type: String },
    ruleId: { type: String },
    cweId: { type: String },
    owaspCategory: { type: String },
  },
  { _id: false }
);

const LanguageBreakdownSchema = new Schema(
  {
    language: { type: String, required: true },
    fileCount: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const IssuesBySeveritySchema = new Schema(
  {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    informational: { type: Number, default: 0 },
  },
  { _id: false }
);

const ComplexitySummarySchema = new Schema(
  {
    averageTimeComplexity: { type: String },
    averageSpaceComplexity: { type: String },
    hotspotFiles: [{ type: String }],
    totalFunctionsAnalyzed: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Main schema ─────────────────────────────────────────────────────────────

export interface IAnalysisReport extends Document {
  reportId: string;
  repositoryId: mongoose.Types.ObjectId;
  analysisRunId?: mongoose.Types.ObjectId;
  repositoryName: string;
  repositoryOwner: string;
  branch: string;
  commitSha?: string;
  overallScore: number; // 0-100
  securityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  languagesDetected: Array<{ language: string; fileCount: number; percentage: number }>;
  totalFilesAnalyzed: number;
  filesSkipped: number;
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  codeReviewFindings: mongoose.Types.Array<Record<string, unknown>>;
  securityFindings: mongoose.Types.Array<Record<string, unknown>>;
  performanceSuggestions: string[];
  complexitySummary: {
    averageTimeComplexity?: string;
    averageSpaceComplexity?: string;
    hotspotFiles: string[];
    totalFunctionsAnalyzed: number;
  };
  recommendedImprovements: string[];
  analysisStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  durationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisReportSchema = new Schema<IAnalysisReport>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    analysisRunId: { type: Schema.Types.ObjectId, ref: 'AnalysisRun' },
    repositoryName: { type: String, required: true },
    repositoryOwner: { type: String, required: true },
    branch: { type: String, required: true, default: 'main' },
    commitSha: { type: String },
    overallScore: { type: Number, min: 0, max: 100, required: true, default: 100 },
    securityGrade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true, default: 'A' },
    languagesDetected: { type: [LanguageBreakdownSchema], default: [] },
    totalFilesAnalyzed: { type: Number, required: true, default: 0 },
    filesSkipped: { type: Number, default: 0 },
    issuesBySeverity: { type: IssuesBySeveritySchema, default: {} },
    codeReviewFindings: { type: [FindingSchema], default: [] },
    securityFindings: { type: [FindingSchema], default: [] },
    performanceSuggestions: [{ type: String }],
    complexitySummary: { type: ComplexitySummarySchema, default: {} },
    recommendedImprovements: [{ type: String }],
    analysisStatus: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index for efficient per-repository report queries
AnalysisReportSchema.index({ repositoryId: 1, createdAt: -1 });

export const AnalysisReportModel = mongoose.model<IAnalysisReport>(
  'AnalysisReport',
  AnalysisReportSchema
);
