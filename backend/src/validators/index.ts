import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  organizationName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const findingFeedbackSchema = z.object({
  status: z.enum(['FALSE_POSITIVE', 'ACCEPTED_RISK', 'NOT_APPLICABLE', 'OPEN', 'RESOLVED']),
  comment: z.string().optional(),
});

export const codeAnalysisSchema = z.object({
  repositoryId: z.string().optional(),
  branch: z.string().default('main'),
  files: z.array(z.string()).optional(),
});

export const testGenerationSchema = z.object({
  repositoryId: z.string().optional(),
  filePath: z.string(),
  functionName: z.string().optional(),
  framework: z.enum(['pytest', 'jest', 'vitest']),
  categories: z.array(z.string()).optional(),
});
