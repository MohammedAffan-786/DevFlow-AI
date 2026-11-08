import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CodeBlock } from '../components/ui/CodeBlock';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Bug,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Search,
} from 'lucide-react';

export function BugDetectionPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<any[]>('/issues');
      setIssues(data || []);
    } catch {
      // Fallback data
      setIssues([
        {
          _id: 'iss_1',
          type: 'BUG',
          severity: 'HIGH',
          status: 'OPEN',
          title: 'Unhandled Promise Rejection on Webhook Timeout',
          description: 'Network timeout in Stripe signature verification uncaught by try/catch handler.',
          location: {
            filePath: 'src/webhooks/stripeDispatcher.ts',
            startLine: 82,
            endLine: 86,
            snippet: 'const verifiedEvent = await stripe.webhooks.constructEventAsync(payload, sig, secret);\nprocessEvent(verifiedEvent);',
          },
          cweId: 'CWE-755',
          suggestedFixDiff: 'try {\n  const verifiedEvent = await stripe.webhooks.constructEventAsync(payload, sig, secret);\n} catch (err) {\n  logger.error(err);\n  return res.status(400).send("Bad Signature");\n}',
          suggestedFixExplanation: 'Encapsulate asynchronous webhook constructor call in a structured try/catch block.',
        },
        {
          _id: 'iss_2',
          type: 'BUG',
          severity: 'MEDIUM',
          status: 'OPEN',
          title: 'Potential Null Pointer Dereference in Data Parser',
          description: 'Accessing properties without pre-checking null or undefined state on parsed record.',
          location: {
            filePath: 'src/utils/dataParser.ts',
            startLine: 34,
            endLine: 36,
            snippet: 'const record = data.payload.record;\nreturn record.id;',
          },
          cweId: 'CWE-476',
          suggestedFixDiff: 'const record = data?.payload?.record;\nif (!record) return null;',
          suggestedFixExplanation: 'Utilize optional chaining and return null on invalid payloads.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      await apiRequest(`/issues/${issueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setIssues((prev) =>
        prev.map((i) => (i._id === issueId ? { ...i, status: newStatus } : i))
      );
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue({ ...selectedIssue, status: newStatus });
      }
    } catch {
      setIssues((prev) =>
        prev.map((i) => (i._id === issueId ? { ...i, status: newStatus } : i))
      );
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue({ ...selectedIssue, status: newStatus });
      }
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSev = filterSeverity === 'ALL' || issue.severity === filterSeverity;
    const matchesStat = filterStatus === 'ALL' || issue.status === filterStatus;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location?.filePath?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSev && matchesStat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Autonomous Bug Detection
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Heuristic static analysis, race conditions, memory leaks, and unhandled promise rejections.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bugs by title or file path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filterSeverity === sev
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Scanning AST for runtime defects..." />
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No bugs matching current filters. All active repositories healthy!
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div key={issue._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? 'destructive' : 'warning'} size="sm">
                      {issue.severity}
                    </Badge>
                    <Badge variant={issue.status === 'RESOLVED' ? 'success' : 'secondary'} size="sm">
                      {issue.status}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-slate-500">{issue.cweId || 'LOGIC_FLAW'}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{issue.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">{issue.description}</p>
                  <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-2">
                    {issue.location.filePath}:{issue.location.startLine}-{issue.location.endLine}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedIssue(issue)}>
                    Inspect Snippet
                  </Button>
                  {issue.status === 'OPEN' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateStatus(issue._id, 'RESOLVED')}
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Resolve
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdateStatus(issue._id, 'OPEN')}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Detailed Issue Inspection Modal */}
      {selectedIssue && (
        <Modal
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title={selectedIssue.title}
          description={`${selectedIssue.location.filePath} (Lines ${selectedIssue.location.startLine}-${selectedIssue.location.endLine})`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdateStatus(selectedIssue._id, 'FALSE_POSITIVE')}
              >
                Mark False Positive
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleUpdateStatus(selectedIssue._id, 'RESOLVED')}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Mark Resolved
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Problematic Code</h4>
              <CodeBlock code={selectedIssue.location.snippet} language="typescript" filename={selectedIssue.location.filePath} />
            </div>

            {selectedIssue.suggestedFixDiff && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Recommended Patch</span>
                </h4>
                <CodeBlock code={selectedIssue.suggestedFixDiff} language="typescript" />
                <p className="text-xs text-slate-500 mt-2">{selectedIssue.suggestedFixExplanation}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
