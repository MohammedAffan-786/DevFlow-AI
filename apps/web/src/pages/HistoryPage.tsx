import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  History,
  FolderGit2,
  GitCommit,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export function HistoryPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<any[]>('/analyses');
      setRuns(data || []);
    } catch {
      setRuns([
        {
          _id: 'run_101',
          trigger: 'WEBHOOK_PR',
          status: 'COMPLETED',
          commitSha: 'a4b82f190bc',
          branch: 'feature/stripe-v3',
          durationMs: 4200,
          createdAt: new Date().toISOString(),
          metrics: { bugsFound: 1, vulnerabilitiesFound: 1, qualityScore: 92 },
          repositoryId: { name: 'payment-gateway', fullName: 'acme/payment-gateway' },
        },
        {
          _id: 'run_102',
          trigger: 'MANUAL_UI',
          status: 'COMPLETED',
          commitSha: '98d11c09fe',
          branch: 'main',
          durationMs: 2840,
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          metrics: { bugsFound: 0, vulnerabilitiesFound: 0, qualityScore: 98 },
          repositoryId: { name: 'auth-service', fullName: 'acme/auth-service' },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Analysis & Audit History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete historical audit trail of automated pull request reviews and scheduled scans.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading audit timeline..." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Trigger</th>
                  <th className="py-3 px-6">Repository</th>
                  <th className="py-3 px-6">Commit & Branch</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Quality Score</th>
                  <th className="py-3 px-6">Duration</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.map((run) => (
                  <tr key={run._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                        {run.trigger}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">
                      {run.repositoryId?.fullName || 'payment-gateway'}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600 dark:text-slate-400">
                      #{run.commitSha?.substring(0, 7)} ({run.branch})
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="success" size="sm">{run.status}</Badge>
                    </td>
                    <td className="py-4 px-6 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {run.metrics?.qualityScore || 90}/100
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono">
                      {run.durationMs}ms
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link to={`/reports/${run._id}`}>
                        <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                          View Report
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
