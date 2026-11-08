import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CodeBlock } from '../components/ui/CodeBlock';
import {
  FlaskConical,
  Sparkles,
  Play,
  AlertCircle,
  FileCode2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function TestGenerationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const repositoryId = searchParams.get('repoId') || 'repo_1';
  const [filePath, setFilePath] = useState('src/services/billingService.ts');
  const [functionName, setFunctionName] = useState('calculateProratedAmount');
  const [targetFramework, setTargetFramework] = useState<'vitest' | 'jest' | 'pytest'>('vitest');

  const [categories, setCategories] = useState<string[]>([
    'NORMAL',
    'BOUNDARY',
    'EDGE_CASE',
    'INVALID_INPUT',
    'EXCEPTION',
    'REGRESSION',
  ]);

  const [sourceCode, setSourceCode] = useState(`export function calculateProratedAmount(input: { amount: number; daysRemaining?: number }): { total: number; status: string } {
  if (!input || input.amount < 0) {
    throw new TypeError("Invalid billing payload: amount must be positive");
  }
  const days = input.daysRemaining ?? 30;
  if (days === 0) return { total: 0, status: "SUCCESS" };
  const total = Math.round((input.amount / 30) * days);
  return { total, status: "SUCCESS" };
}`);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFile, setGeneratedFile] = useState<any | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiRequest<{ testFile: any }>('/tests/generate', {
        method: 'POST',
        body: JSON.stringify({
          repositoryId,
          filePath,
          functionName,
          sourceCode,
          targetFramework,
          categories,
        }),
      });
      setGeneratedFile(res.testFile);
      if (res.testFile?.testCases?.length > 0) {
        setExpandedCaseId(res.testFile.testCases[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to synthesize test suite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteInSandbox = () => {
    if (!generatedFile) return;
    sessionStorage.setItem('active_test_file', JSON.stringify(generatedFile));
    sessionStorage.setItem('active_source_code', sourceCode);
    navigate(`/tests/execution?repoId=${repositoryId}&framework=${targetFramework}`);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'NORMAL':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'BOUNDARY':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'EDGE_CASE':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'INVALID_INPUT':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'EXCEPTION':
        return 'bg-rose-50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'REGRESSION':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
            Autonomous Test Suite Generator
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Context-Aware Unit Test Generation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Synthesize full-coverage test files with boundary, edge case, invalid input, exception, and regression suites.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration Form */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Target Module & Scope</CardTitle>
            <CardDescription>
              Select target source file, individual function, and framework.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Target File</label>
                  <Input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="e.g. src/services/billing.ts"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Function Name</label>
                  <Input
                    value={functionName}
                    onChange={(e) => setFunctionName(e.target.value)}
                    placeholder="e.g. calculateProratedAmount"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Test Framework</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['vitest', 'jest', 'pytest'] as const).map((fw) => (
                    <button
                      type="button"
                      key={fw}
                      onClick={() => setTargetFramework(fw)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        targetFramework === fw
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {fw === 'pytest' ? 'Python (pytest)' : fw === 'vitest' ? 'TypeScript (Vitest)' : 'JS/TS (Jest)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Test Case Categories to Generate (All 6 Recommended)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'NORMAL', label: 'Normal Cases' },
                    { id: 'BOUNDARY', label: 'Boundary Values' },
                    { id: 'EDGE_CASE', label: 'Edge Cases' },
                    { id: 'INVALID_INPUT', label: 'Invalid Inputs' },
                    { id: 'EXCEPTION', label: 'Exceptions' },
                    { id: 'REGRESSION', label: 'Regressions' },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                        categories.includes(cat.id)
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={categories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded text-indigo-600"
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Source Code Context
                </label>
                <textarea
                  rows={8}
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  className="w-full font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-950 text-slate-100 p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                icon={<Sparkles className="w-4 h-4" />}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Synthesize Test Suite ({categories.length} Categories)
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Generated Test Suite Preview */}
        <div className="space-y-4">
          {generatedFile ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-indigo-500" />
                    {generatedFile.fileName}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {generatedFile.testCases.length} test cases synthesized
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteInSandbox}
                  icon={<Play className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Execute in Isolated Sandbox
                </Button>
              </div>

              {/* Test Cases Breakdown */}
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {generatedFile.testCases.map((tc: any) => {
                  const isExpanded = expandedCaseId === tc.id;
                  return (
                    <Card key={tc.id} className="overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div
                        className="p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/40 flex items-center justify-between"
                        onClick={() => setExpandedCaseId(isExpanded ? null : tc.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getCategoryColor(tc.category)}`}>
                            {tc.category}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {tc.name}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                          <p className="text-slate-600 dark:text-slate-400 mt-3">{tc.description}</p>
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                            <div>
                              <span className="font-bold text-[10px] uppercase text-slate-400 block">Input</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{tc.inputDescription}</span>
                            </div>
                            <div>
                              <span className="font-bold text-[10px] uppercase text-slate-400 block">Expected Output</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{tc.expectedOutput}</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">Generated Test Code</span>
                            <CodeBlock code={tc.code} language={generatedFile.language} />
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-500">
              <FlaskConical className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Tests Generated Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Configure your target module, framework, and categories on the left and click "Synthesize Test Suite".
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
