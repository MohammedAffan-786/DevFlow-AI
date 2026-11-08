import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/ui/CodeBlock';
import {
  BarChart3,
  Cpu,
  Layers,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Info,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ComplexityData {
  estimatedTimeComplexity: string;
  estimatedSpaceComplexity: string;
  explanation: string;
  inefficientLoops: Array<{ line: number; code: string; reason: string }>;
  optimizationSuggestions: string[];
  beforeAfterComparison: {
    beforeComplexity: string;
    afterComplexity: string;
    beforeCode: string;
    afterCode: string;
  };
  distinctionNote: string;
}

export function ComplexityPage() {
  const [code, setCode] = useState(`function reconcileTransactions(transactions: any[], settlements: any[]) {
  const matched = [];
  // Quadratic O(n^2) nested loop over transaction records
  for (let i = 0; i < transactions.length; i++) {
    for (let j = 0; j < settlements.length; j++) {
      if (transactions[i].id === settlements[j].txId) {
        matched.push({ tx: transactions[i], settlement: settlements[j] });
        break;
      }
    }
  }
  return matched;
}`);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ComplexityData | null>({
    estimatedTimeComplexity: 'O(n²)',
    estimatedSpaceComplexity: 'O(n)',
    explanation: 'Nested loops over transactions and settlements result in quadratic time complexity O(n*m). As transaction volume scales to 10,000+ entries, execution operations increase up to 100,000,000 iterations.',
    inefficientLoops: [
      {
        line: 5,
        code: 'for (let j = 0; j < settlements.length; j++)',
        reason: 'Inner loop executes settlements.length times for every single transaction in the outer loop.',
      },
    ],
    optimizationSuggestions: [
      'Pre-index settlements array into a Map keyed by txId to convert inner O(n) search into O(1) hash table lookup.',
      'Reduce overall complexity from quadratic O(n²) to linear O(n + m).',
    ],
    beforeAfterComparison: {
      beforeComplexity: 'O(n²)',
      afterComplexity: 'O(n)',
      beforeCode: `// Quadratic O(n^2) nested iteration
for (let i = 0; i < transactions.length; i++) {
  for (let j = 0; j < settlements.length; j++) {
    if (transactions[i].id === settlements[j].txId) { ... }
  }
}`,
      afterCode: `// Optimized linear O(n) hash table lookup
const settlementMap = new Map(settlements.map(s => [s.txId, s]));
for (const tx of transactions) {
  const match = settlementMap.get(tx.id);
  if (match) matched.push({ tx, settlement: match });
}`,
    },
    distinctionNote: 'Theoretical complexity is derived mathematically from AST loop nesting depth and branching invariants. Measured real-world execution latency depends on V8 JIT inline caching, hardware L1/L2 cache locality, and garbage collection pauses.',
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest<ComplexityData>('/intelligence/complexity', {
        method: 'POST',
        body: JSON.stringify({ code, language: 'typescript', filePath: 'routine.ts' }),
      });
      setData(res);
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
          Algorithmic Complexity & Hotspot Analyzer
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Estimate time/space asymptotic upper bounds, detect inefficient loops, and benchmark before-and-after optimizations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form Column */}
        <Card>
          <CardHeader>
            <CardTitle>Algorithm Routine Input</CardTitle>
            <CardDescription>Paste function or algorithm implementation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyze} className="space-y-4">
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
                icon={<BarChart3 className="w-4 h-4" />}
              >
                Evaluate Algorithmic Complexity
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Output Metrics Column */}
        {data && (
          <div className="space-y-4">
            {/* Top Score Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 text-center border-l-4 border-l-indigo-500">
                <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Time Complexity</span>
                <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                  {data.estimatedTimeComplexity}
                </div>
                <span className="text-[10px] text-slate-400">Worst-case asymptotic bound</span>
              </Card>

              <Card className="p-5 text-center border-l-4 border-l-emerald-500">
                <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Space Complexity</span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {data.estimatedSpaceComplexity}
                </div>
                <span className="text-[10px] text-slate-400">Memory allocation scaling</span>
              </Card>
            </div>

            {/* Complexity Explanation */}
            <Card className="p-5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Complexity Analysis & Derivation
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {data.explanation}
              </p>
            </Card>

            {/* Inefficient Loops Detected */}
            {data.inefficientLoops.length > 0 && (
              <Card className="p-5 border-l-4 border-l-amber-500">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Inefficient Loop Hotspots ({data.inefficientLoops.length})
                </span>
                <div className="space-y-2">
                  {data.inefficientLoops.map((loop, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-amber-800 dark:text-amber-300 font-bold">Line {loop.line}</span>
                        <Badge variant="warning" size="sm">O(n²) Hotspot</Badge>
                      </div>
                      <code className="block font-mono text-[11px] text-slate-800 dark:text-slate-200 bg-black/10 dark:bg-black/30 p-1.5 rounded mb-1.5">
                        {loop.code}
                      </code>
                      <p className="text-slate-600 dark:text-slate-400">{loop.reason}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Before vs After Comparison */}
            {data.beforeAfterComparison && (
              <Card className="p-5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  Before & After Optimization Comparison
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-600">Current</span>
                      <Badge variant="destructive" size="sm" className="font-mono">
                        {data.beforeAfterComparison.beforeComplexity}
                      </Badge>
                    </div>
                    <CodeBlock code={data.beforeAfterComparison.beforeCode} language="typescript" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-600">Optimized</span>
                      <Badge variant="success" size="sm" className="font-mono">
                        {data.beforeAfterComparison.afterComplexity}
                      </Badge>
                    </div>
                    <CodeBlock code={data.beforeAfterComparison.afterCode} language="typescript" />
                  </div>
                </div>
              </Card>
            )}

            {/* Theoretical vs Measured Note */}
            <Card className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  <strong>Theoretical vs. Measured Performance: </strong>
                  {data.distinctionNote}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
