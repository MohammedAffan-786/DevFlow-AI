import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  HelpCircle,
  Sparkles,
  ArrowRight,
  Layers,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Lightbulb,
  Cpu,
  Package,
} from 'lucide-react';

interface CodeExplanationData {
  simpleExplanation: string;
  purpose: string;
  functionExplanations: Array<{ name: string; lineRange: string; explanation: string }>;
  inputOutput: { inputs: string[]; outputs: string[]; sideEffects: string[] };
  dependencies: string[];
  potentialProblems: string[];
  improvementSuggestions: string[];
}

export function ExplainPage() {
  const [code, setCode] = useState(`export async function verifySignature(req: Request, secret: string): Promise<boolean> {
  const sig = req.headers['x-hub-signature-256'] as string;
  if (!sig) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.body);
  const expected = 'sha256=' + hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`);

  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python'>('typescript');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CodeExplanationData | null>({
    simpleExplanation: 'This code checks whether an incoming HTTP webhook request actually came from GitHub by verifying a cryptographic signature.',
    purpose: 'Validate GitHub webhook payload authenticity and prevent spoofed requests using HMAC-SHA256.',
    functionExplanations: [
      {
        name: 'verifySignature',
        lineRange: 'Lines 1-10',
        explanation: 'Extracts the x-hub-signature-256 header, computes an HMAC-SHA256 digest of the request body using a shared secret, and compares the hashes in constant time.',
      },
    ],
    inputOutput: {
      inputs: ['req: Express Request containing body and x-hub-signature-256 header', 'secret: Pre-shared HMAC secret key string'],
      outputs: ['Promise<boolean>: true if valid and authentic, false otherwise'],
      sideEffects: ['None (pure computational verification)'],
    },
    dependencies: ['crypto (Node.js built-in)', 'express Request type'],
    potentialProblems: [
      'crypto.timingSafeEqual throws RangeError if Buffer lengths differ (e.g. if header is truncated).',
      'req.body must be raw Buffer or string; JSON-parsed body will produce mismatched digest.',
    ],
    improvementSuggestions: [
      'Check Buffer.byteLength equality before calling crypto.timingSafeEqual to avoid unhandled RangeError.',
      'Ensure raw body middleware (express.raw()) is configured for the webhook endpoint.',
    ],
  });

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest<CodeExplanationData>('/intelligence/explain', {
        method: 'POST',
        body: JSON.stringify({ code, language, filePath: 'snippet.ts' }),
      });
      setResult(res);
    } catch {
      // Keep existing data on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Code Comprehension & Explanation Engine
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Structured explanation, code purpose, function breakdown, dependencies, inputs/outputs, and edge cases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form Column */}
        <Card>
          <CardHeader>
            <CardTitle>Code Input</CardTitle>
            <CardDescription>Paste code snippet to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExplain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Source Code</label>
                <textarea
                  rows={14}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-950 text-slate-100 p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                isLoading={isLoading}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Generate Structured Explanation
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Output Explanation Column */}
        <div className="space-y-4">
          {result && (
            <>
              {/* 1. Simple Explanation & Purpose */}
              <Card className="p-5 border-l-4 border-l-indigo-500">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                  High-Level Overview
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {result.purpose}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {result.simpleExplanation}
                </p>
              </Card>

              {/* 2. Function-by-Function Explanation */}
              <Card className="p-5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  Function-by-Function Breakdown
                </span>
                <div className="space-y-2.5">
                  {result.functionExplanations.map((fn, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{fn.name}()</span>
                        <span className="text-[10px] text-slate-400 font-mono">{fn.lineRange}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{fn.explanation}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 3. Inputs, Outputs & Dependencies */}
              <Card className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                      Inputs & Arguments
                    </span>
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {result.inputOutput.inputs.map((inp, idx) => (
                        <li key={idx} className="truncate">{inp}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                      Return Contract
                    </span>
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {result.inputOutput.outputs.map((out, idx) => (
                        <li key={idx} className="truncate">{out}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-400 font-medium">Dependencies:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.dependencies.map((dep, idx) => (
                      <Badge key={idx} variant="outline" size="sm" className="font-mono text-[10px]">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>

              {/* 4. Potential Problems & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 border-l-4 border-l-amber-500">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Potential Problems
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {result.potentialProblems.map((prob, idx) => (
                      <li key={idx} className="leading-relaxed">• {prob}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Improvement Suggestions
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {result.improvementSuggestions.map((sug, idx) => (
                      <li key={idx} className="leading-relaxed">• {sug}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
