/**
 * intelligenceRoutes.ts
 * Per-file and per-snippet AI intelligence endpoints:
 *   - Code explanation
 *   - Complexity analysis
 *   - Security scan
 *   - Code review
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { explainCode } from '../services/explanationEngine';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import { scanFile } from '../services/securityScanner';
import { reviewFile } from '../services/codeReviewer';

const router = Router();
router.use(authMiddleware);

// ─── Shared schemas ───────────────────────────────────────────────────────────

const SnippetSchema = z.object({
  code: z.string().min(1, 'Code snippet is required').max(100_000, 'Snippet too large (max 100 KB)'),
  language: z.enum(['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'unknown']).default('unknown'),
  filePath: z.string().optional().default('snippet.ts'),
  focusArea: z.string().optional(),
});

// ─── Code explanation ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/intelligence/explain
 * Returns a structured explanation of the provided code snippet.
 */
router.post(
  '/explain',
  validate({ body: SnippetSchema }),
  async (req: Request, res: Response) => {
    const { code, language, filePath } = req.body as z.infer<typeof SnippetSchema>;

    try {
      const result = explainCode(filePath ?? 'snippet', code, language);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[IntelligenceRoutes] explain error:', err);
      return res.status(500).json({ success: false, error: 'Code explanation failed' });
    }
  }
);

// ─── Complexity analysis ──────────────────────────────────────────────────────

/**
 * POST /api/v1/intelligence/complexity
 * Returns time/space complexity estimates for the provided code.
 */
router.post(
  '/complexity',
  validate({ body: SnippetSchema }),
  async (req: Request, res: Response) => {
    const { code, language, filePath } = req.body as z.infer<typeof SnippetSchema>;

    try {
      const result = analyzeComplexity(filePath ?? 'snippet', code, language);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[IntelligenceRoutes] complexity error:', err);
      return res.status(500).json({ success: false, error: 'Complexity analysis failed' });
    }
  }
);

// ─── Security scan ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/intelligence/security-scan
 * Runs deterministic security rules against a code snippet.
 */
router.post(
  '/security-scan',
  validate({ body: SnippetSchema }),
  async (req: Request, res: Response) => {
    const { code, filePath } = req.body as z.infer<typeof SnippetSchema>;

    try {
      const findings = scanFile(filePath ?? 'snippet', code);

      return res.status(200).json({
        success: true,
        data: {
          findings,
          totalFindings: findings.length,
          criticalCount: findings.filter(f => f.severity === 'CRITICAL').length,
          highCount: findings.filter(f => f.severity === 'HIGH').length,
          mediumCount: findings.filter(f => f.severity === 'MEDIUM').length,
          lowCount: findings.filter(f => f.severity === 'LOW').length,
        },
      });
    } catch (err) {
      console.error('[IntelligenceRoutes] security-scan error:', err);
      return res.status(500).json({ success: false, error: 'Security scan failed' });
    }
  }
);

// ─── Code review ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/intelligence/review
 * Runs deterministic code quality rules against a code snippet.
 */
router.post(
  '/review',
  validate({ body: SnippetSchema }),
  async (req: Request, res: Response) => {
    const { code, filePath } = req.body as z.infer<typeof SnippetSchema>;

    try {
      const findings = reviewFile(filePath ?? 'snippet', code);

      return res.status(200).json({
        success: true,
        data: {
          findings,
          totalFindings: findings.length,
          criticalCount: findings.filter(f => f.severity === 'CRITICAL').length,
          highCount: findings.filter(f => f.severity === 'HIGH').length,
          mediumCount: findings.filter(f => f.severity === 'MEDIUM').length,
          lowCount: findings.filter(f => f.severity === 'LOW').length,
        },
      });
    } catch (err) {
      console.error('[IntelligenceRoutes] review error:', err);
      return res.status(500).json({ success: false, error: 'Code review failed' });
    }
  }
);

// ─── Combined analysis ────────────────────────────────────────────────────────

/**
 * POST /api/v1/intelligence/analyze
 * Runs all intelligence passes on a code snippet in one request.
 */
router.post(
  '/analyze',
  validate({ body: SnippetSchema }),
  async (req: Request, res: Response) => {
    const { code, language, filePath } = req.body as z.infer<typeof SnippetSchema>;
    const path = filePath ?? 'snippet';

    try {
      const [explanation, complexity, securityFindings, reviewFindings] = await Promise.all([
        Promise.resolve(explainCode(path, code, language)),
        Promise.resolve(analyzeComplexity(path, code, language)),
        Promise.resolve(scanFile(path, code)),
        Promise.resolve(reviewFile(path, code)),
      ]);

      const allFindings = [...securityFindings, ...reviewFindings];
      const qualityScore = Math.max(
        0,
        100 -
          securityFindings.filter(f => f.severity === 'CRITICAL').length * 15 -
          securityFindings.filter(f => f.severity === 'HIGH').length * 8 -
          reviewFindings.filter(f => f.severity === 'HIGH').length * 5 -
          reviewFindings.filter(f => f.severity === 'MEDIUM').length * 3
      );

      return res.status(200).json({
        success: true,
        data: {
          explanation,
          complexity,
          securityFindings,
          reviewFindings,
          totalFindings: allFindings.length,
          qualityScore,
        },
      });
    } catch (err) {
      console.error('[IntelligenceRoutes] analyze error:', err);
      return res.status(500).json({ success: false, error: 'Combined analysis failed' });
    }
  }
);

export default router;
