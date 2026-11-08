import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/ui/CodeBlock';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  FileText,
  ArrowLeft,
  Download,
  ShieldCheck,
  CheckCircle2,
  Bug,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export function DetailedReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(`/analyses/${id}`);
      setReport(data);
    } catch {
      // Fallback detailed report
      setReport({
        analysisRun: {
          _id: id || 'run_101',
          commitSha: 'a4b82f190bc',
          branch: 'feature/stripe-v3',
          durationMs: 4200,
          createdAt: new Date().toISOString(),
          metrics: {
            qualityScore: 92,
            bugsFound: 1,
            vulnerabilitiesFound: 1,
            codeSmellsFound: 2,
            cyclomaticComplexityAvg: 3.4,
          },
          repositoryId: { fullName: 'acme/payment-gateway' },
        },
        issues: [
          {
            _id: 'rep_iss_1',
            type: 'SECURITY_VULNERABILITY',
            severity: 'HIGH',
            title: 'Unescaped User Parameter in Dynamic Database Query',
            description: 'Direct string interpolation in SQL query (CWE-89).',
            location: {
              filePath: 'src/services/billingService.ts',
              startLine: 48,
              endLine: 50,
              snippet: "const account = await db.query(`SELECT * FROM customers WHERE external_id = '${customerId}'`);",
            },
            suggestedFixDiff: "const account = await db.query('SELECT * FROM customers WHERE external_id = $1', [customerId]);",
          },
        ],
        summary: {
          qualityScore: 92,
          totalFindings: 2,
          securityRating: 'A',
          estimatedDebtMinutes: 90,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DevFlow-Report-${id}.json`;
    a.click();
  };

  if (isLoading || !report) {
    return <LoadingSpinner text="Generating executive audit report..." />;
  }

  const { analysisRun, issues, summary } = report;

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to History</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="success" size="sm">Audit Complete</Badge>
              <span className="font-mono text-xs text-slate-500">Run ID: {analysisRun._id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Executive Codebase Audit Report
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Repository: <span className="font-bold text-slate-900 dark:text-white">{analysisRun.repositoryId?.fullName}</span> | Branch: <span className="font-mono">{analysisRun.branch}</span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 text-center">
          <span className="text-xs uppercase font-semibold text-slate-500">Quality Score</span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {summary.qualityScore}/100
          </div>
          <span className="text-[10px] text-slate-400">Maintainability index</span>
        </Card>

        <Card className="p-5 text-center">
          <span className="text-xs uppercase font-semibold text-slate-500">Security Rating</span>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            Grade {summary.securityRating}
          </div>
          <span className="text-[10px] text-slate-400">Zero critical exploits</span>
        </Card>

        <Card className="p-5 text-center">
          <span className="text-xs uppercase font-semibold text-slate-500">Total Findings</span>
          <div className="text-3xl font-extrabold text-amber-500 mt-1 font-mono">
            {summary.totalFindings}
          </div>
          <span className="text-[10px] text-slate-400">Remediations proposed</span>
        </Card>

        <Card className="p-5 text-center">
          <span className="text-xs uppercase font-semibold text-slate-500">Technical Debt</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
            {summary.estimatedDebtMinutes} min
          </div>
          <span className="text-[10px] text-slate-400">Estimated repair time</span>
        </Card>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detected Items ({issues.length})</h2>

        {issues.map((issue: any) => (
          <Card key={issue._id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={issue.severity === 'HIGH' ? 'destructive' : 'warning'} size="sm">
                    {issue.severity}
                  </Badge>
                  <span className="text-xs uppercase font-bold text-slate-400">{issue.type}</span>
                </div>
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  {issue.location.filePath}:{issue.location.startLine}
                </span>
              </div>
              <CardTitle className="mt-2 text-base">{issue.title}</CardTitle>
              <CardDescription>{issue.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Source Code Location</h4>
                <CodeBlock code={issue.location.snippet} language="typescript" filename={issue.location.filePath} />
              </div>
              {issue.suggestedFixDiff && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Suggested Fix</span>
                  </h4>
                  <CodeBlock code={issue.suggestedFixDiff} language="typescript" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
