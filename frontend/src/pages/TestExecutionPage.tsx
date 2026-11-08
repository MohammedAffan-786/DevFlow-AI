import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/ui/CodeBlock';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Terminal,
  Play,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Cpu,
  Clock,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  FileText,
  History,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Lock,
} from 'lucide-react';

export function TestExecutionPage() {
  const [searchParams] = useSearchParams();
  const repoId = searchParams.get('repoId') || 'repo_1';
  const framework = (searchParams.get('framework') as 'vitest' | 'jest' | 'pytest') || 'vitest';

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'errors' | 'report' | 'history'>('results');

  // Test File from Session Storage or Default Demo
  const [testFile, setTestFile] = useState<any>(() => {
    const saved = sessionStorage.getItem('active_test_file');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      fileName: 'billingService.spec.ts',
      filePath: 'tests/billingService.spec.ts',
      targetFilePath: 'src/services/billingService.ts',
      language: 'typescript',
      framework: 'vitest',
      fullCode: `import { describe, it, expect } from 'vitest';\nimport { calculateProratedAmount } from './billingService';\n\ndescribe('calculateProratedAmount', () => {\n  it('normal: calculates valid prorated total', () => {\n    const res = calculateProratedAmount({ amount: 100, daysRemaining: 15 });\n    expect(res.total).toBe(50);\n  });\n});`,
      testCases: [
        { id: '1', name: 'test_calculateProratedAmount_normal_execution', category: 'NORMAL' },
        { id: '2', name: 'test_calculateProratedAmount_boundary_limits', category: 'BOUNDARY' },
        { id: '3', name: 'test_calculateProratedAmount_edge_case_empty_collection', category: 'EDGE_CASE' },
        { id: '4', name: 'test_calculateProratedAmount_invalid_input_type', category: 'INVALID_INPUT' },
        { id: '5', name: 'test_calculateProratedAmount_raises_on_null_or_missing', category: 'EXCEPTION' },
        { id: '6', name: 'test_calculateProratedAmount_regression_idempotence', category: 'REGRESSION' },
      ],
    };
  });

  const [sourceCode] = useState<string>(() => {
    return sessionStorage.getItem('active_source_code') || 'export function calculateProratedAmount() { ... }';
  });

  // Execution & Report States
  const [executionResult, setExecutionResult] = useState<any>({
    runId: 'run_init_78a1',
    status: 'PASSED',
    totalTests: 6,
    passedTests: 6,
    failedTests: 0,
    skippedTests: 0,
    durationMs: 142,
    exitCode: 0,
    stdout: ` ✓ tests/billingService.spec.ts (6 tests)\n   ✓ should verify calculateProratedAmount normal execution (4ms)\n   ✓ should verify calculateProratedAmount boundary thresholds (3ms)\n   ✓ should verify calculateProratedAmount edge cases (2ms)\n   ✓ should verify calculateProratedAmount invalid inputs (3ms)\n   ✓ should verify calculateProratedAmount exception handling (4ms)\n   ✓ should verify calculateProratedAmount regression idempotence (3ms)\n\n Test Files  1 passed (1)\n      Tests  6 passed (6)\n   Duration  142ms\n`,
    stderr: '',
    errorMessages: [],
    stackTraces: [],
    failedAssertions: [],
    coverage: { lines: 94.2, branches: 88.0, functions: 100.0, statements: 92.8 },
  });

  const [testReport, setTestReport] = useState<any>({
    whatWasTested: [
      'Target Module: src/services/billingService.ts',
      'Test Framework: vitest',
      'Categories Tested: NORMAL, BOUNDARY, EDGE_CASE, INVALID_INPUT, EXCEPTION, REGRESSION',
      'Total Invariants Verified: 6',
    ],
    whatPassed: [
      '[NORMAL] test_calculateProratedAmount_normal_execution — status: SUCCESS',
      '[BOUNDARY] test_calculateProratedAmount_boundary_limits — zero & MAX_SAFE_INTEGER bounds',
      '[EDGE_CASE] test_calculateProratedAmount_edge_case_empty_collection — empty collection invariants',
      '[INVALID_INPUT] test_calculateProratedAmount_invalid_input_type — negative input throws',
      '[EXCEPTION] test_calculateProratedAmount_raises_on_null_or_missing — null pointer rejection',
      '[REGRESSION] test_calculateProratedAmount_regression_idempotence — state purity across consecutive runs',
    ],
    whatFailed: [],
    whyTestsFailed: [],
    suggestedFixes: [],
    coverageLimitations: [
      'External payment provider webhook calls mocked out due to network isolation (--network none).',
    ],
    recommendedAdditionalTests: [
      'Add multi-threaded race condition tests to verify concurrent billing computations.',
    ],
  });

  // History & Comparison States
  const [historyRuns, setHistoryRuns] = useState<any[]>([]);
  const [compareRunA, setCompareRunA] = useState<string>('');
  const [compareRunB, setCompareRunB] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await apiRequest<{ runs: any[] }>(`/tests/runs?repositoryId=${repoId}`);
      setHistoryRuns(res.runs || []);
      if (res.runs?.length >= 2) {
        setCompareRunA(res.runs[0].runId);
        setCompareRunB(res.runs[1].runId);
      }
    } catch {}
  };

  const handleRunExecution = async () => {
    setIsRunning(true);
    try {
      const res = await apiRequest<{ execution: any; report: any }>('/tests/execute', {
        method: 'POST',
        body: JSON.stringify({
          repositoryId: repoId,
          branch: 'main',
          commitSha: '7f91c3e',
          testFile,
          sourceCode,
          timeoutSeconds: 15,
        }),
      });

      setExecutionResult(res.execution);
      setTestReport(res.report);
      await fetchHistory();
    } catch (err: any) {
      console.error('Execution failure:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCompare = async () => {
    if (!compareRunA || !compareRunB) return;
    try {
      const res = await apiRequest<any>(`/tests/compare?runA=${compareRunA}&runB=${compareRunB}`);
      setComparisonData(res);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              Isolated Execution Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sandboxed Test Runner
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Execute unit and integration tests inside ephemeral, zero-network, read-only sandboxes.
          </p>
        </div>

        <Button
          variant="default"
          size="md"
          onClick={handleRunExecution}
          isLoading={isRunning}
          icon={<Play className="w-4 h-4" />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isRunning ? 'Running in Sandbox...' : 'Run Test Suite'}
        </Button>
      </div>

      {/* Security Specification Box */}
      <Card className="p-4 bg-slate-900 text-white border-slate-800">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Ephemeral Sandbox Security Enforcement
            </span>
          </div>
          <Badge variant="outline" size="sm" className="border-emerald-500 text-emerald-400 font-mono text-[10px]">
            ACTIVE CONTAINER ISOLATION
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">User Privileges</span>
            <span className="font-mono text-emerald-400 font-bold">UID 10001 (non-root)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Network Access</span>
            <span className="font-mono text-emerald-400 font-bold">--network none</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">CPU Allocation</span>
            <span className="font-mono text-emerald-400 font-bold">1.0 vCPU Hard Cap</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Memory Ceiling</span>
            <span className="font-mono text-emerald-400 font-bold">256 MB RAM</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Filesystem</span>
            <span className="font-mono text-emerald-400 font-bold">Read-Only Root + tmpfs</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Watchdog Timeout</span>
            <span className="font-mono text-emerald-400 font-bold">15s Hard Kill</span>
          </div>
        </div>
      </Card>

      {/* Execution Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Tests</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
            {executionResult.totalTests}
          </div>
          <span className="text-[10px] text-slate-400">{testFile.fileName}</span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Passed</span>
          <div className="text-2xl font-extrabold text-emerald-500 mt-1 font-mono">
            {executionResult.passedTests}
          </div>
          <span className="text-[10px] text-slate-400">Strict verified execution</span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Failed</span>
          <div className={`text-2xl font-extrabold mt-1 font-mono ${executionResult.failedTests > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            {executionResult.failedTests}
          </div>
          <span className="text-[10px] text-slate-400">{executionResult.failedTests > 0 ? 'Failed assertions' : '0 errors'}</span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Duration</span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {executionResult.durationMs}ms
          </div>
          <span className="text-[10px] text-slate-400">Execution runtime</span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Line Coverage</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {executionResult.coverage?.lines || 0}%
          </div>
          <span className="text-[10px] text-slate-400">Module coverage</span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <button
          onClick={() => setActiveTab('results')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'results'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Execution Log & Coverage
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'errors'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Failed Assertions ({executionResult.failedAssertions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'report'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Detailed Test Report
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Test Run History & Compare
        </button>
      </div>

      {/* Tab 1: Results & Terminal Output */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Coverage Progress Bars */}
          {executionResult.coverage && (
            <Card className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Granular Code Coverage Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Lines</span>
                    <span className="font-bold text-emerald-500">{executionResult.coverage.lines}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${executionResult.coverage.lines}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Branches</span>
                    <span className="font-bold text-indigo-500">{executionResult.coverage.branches}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${executionResult.coverage.branches}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Functions</span>
                    <span className="font-bold text-amber-500">{executionResult.coverage.functions}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${executionResult.coverage.functions}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Statements</span>
                    <span className="font-bold text-blue-500">{executionResult.coverage.statements}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${executionResult.coverage.statements}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Terminal Box */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-bold text-slate-300">sandbox://workspace/test-runner</span>
              </span>
              <span className="text-[10px]">exit code: {executionResult.exitCode}</span>
            </div>
            <pre className="p-4 text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {executionResult.stdout || executionResult.stderr || 'No execution output recorded.'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Failed Assertions & Errors */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          {executionResult.failedAssertions.length === 0 ? (
            <Card className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900 dark:text-white">Zero Failed Assertions</h3>
              <p className="text-xs text-slate-400 mt-1">All test cases passed within verified boundary contracts.</p>
            </Card>
          ) : (
            executionResult.failedAssertions.map((fa: any, idx: number) => (
              <Card key={idx} className="p-5 border-l-4 border-l-rose-500 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    {fa.testName}
                  </span>
                  <Badge variant="destructive" size="sm">Failed Assertion</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase text-emerald-600 font-bold block">Expected</span>
                    <span className="text-slate-800 dark:text-slate-200">{fa.expected}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-rose-600 font-bold block">Actual Received</span>
                    <span className="text-rose-600 dark:text-rose-400">{fa.actual}</span>
                  </div>
                </div>
                {fa.stackTrace && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stack Trace</span>
                    <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto">
                      {fa.stackTrace}
                    </pre>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Detailed Test Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* What Was Tested */}
            <Card className="p-5">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-2">
                What Was Tested
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                {testReport.whatWasTested.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Card>

            {/* Coverage Limitations */}
            <Card className="p-5">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-2">
                Coverage Limitations
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                {testReport.coverageLimitations.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>

          {/* What Passed */}
          <Card className="p-5">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
              <CheckCircle2 className="w-4 h-4" />
              Verified Passing Invariants ({testReport.whatPassed.length})
            </span>
            <div className="space-y-2">
              {testReport.whatPassed.map((item: string, idx: number) => (
                <div key={idx} className="p-2.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          {/* Recommended Additional Tests */}
          <Card className="p-5">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-3">
              <Cpu className="w-4 h-4" />
              Recommended Additional Invariant Tests
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
              {testReport.recommendedAdditionalTests.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Tab 4: History & Run Comparison */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Compare Tool */}
          <Card className="p-5">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-3">
              Compare Two Execution Runs
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Run A (Base)</label>
                <select
                  value={compareRunA}
                  onChange={(e) => setCompareRunA(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-slate-100"
                >
                  {historyRuns.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {r.runId} ({r.commitSha?.slice(0, 7)}) — {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Run B (Target)</label>
                <select
                  value={compareRunB}
                  onChange={(e) => setCompareRunB(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-slate-100"
                >
                  {historyRuns.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {r.runId} ({r.commitSha?.slice(0, 7)}) — {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={handleCompare}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9"
              >
                Compare Runs
              </Button>
            </div>

            {comparisonData && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Comparison Matrix</span>
                  <Badge variant={comparisonData.regressionDetected ? 'destructive' : 'success'} size="sm">
                    {comparisonData.regressionDetected ? 'Regression Detected' : 'No Regressions'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Tests Delta</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {comparisonData.delta.testsDelta >= 0 ? `+${comparisonData.delta.testsDelta}` : comparisonData.delta.testsDelta}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Passed Delta</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {comparisonData.delta.passedDelta >= 0 ? `+${comparisonData.delta.passedDelta}` : comparisonData.delta.passedDelta}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Failed Delta</span>
                    <span className="font-mono font-bold text-rose-500">
                      {comparisonData.delta.failedDelta >= 0 ? `+${comparisonData.delta.failedDelta}` : comparisonData.delta.failedDelta}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Coverage Delta</span>
                    <span className="font-mono font-bold text-indigo-500">
                      {comparisonData.delta.coverageDeltaLines}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* History Runs Table */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm">Recorded Test Runs History</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {historyRuns.map((run) => (
                <div key={run.runId} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {run.runId}
                    </span>
                    <Badge variant={run.status === 'PASSED' ? 'success' : 'destructive'} size="sm">
                      {run.status}
                    </Badge>
                    <span className="font-mono text-slate-400">{run.commitSha?.slice(0, 7)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 font-mono">
                    <span>{run.results?.totalTests} tests ({run.results?.passedTests} passed)</span>
                    <span>{run.results?.durationMs}ms</span>
                    <span className="text-slate-400">{new Date(run.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
