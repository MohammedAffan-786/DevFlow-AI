import { Router, Request, Response } from 'express';
import { validate } from '../middlewares/validateMiddleware';
import { ExplainCodeSchema, ComplexityAnalysisSchema } from '@devflow/shared';
import { ExplanationEngine } from '../services/explanationEngine';
import { ComplexityAnalyzer } from '../services/complexityAnalyzer';

const router = Router();

// POST /api/v1/tools/explain
router.post('/explain', validate({ body: ExplainCodeSchema }), async (req: Request, res: Response) => {
  const { code, language = 'typescript', focus } = req.body;

  try {
    const explanation = ExplanationEngine.explainCode(code, language);
    res.status(200).json({
      success: true,
      data: {
        focus,
        language,
        analysis: explanation.simpleExplanation,
        detailedExplanation: explanation,
        summary: `Analyzed ${code.split('\n').length} lines of ${language} code with focus on ${focus || 'overall architecture'}.`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Explanation failed' });
  }
});

// POST /api/v1/tools/complexity
router.post('/complexity', validate({ body: ComplexityAnalysisSchema }), async (req: Request, res: Response) => {
  const { code, language = 'typescript' } = req.body;

  try {
    const analysis = ComplexityAnalyzer.analyzeComplexity(code, language);
    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Complexity analysis failed' });
  }
});

export default router;
