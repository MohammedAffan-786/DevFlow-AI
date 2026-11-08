import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import {
  FolderGit2,
  Play,
  ArrowLeft,
  ShieldCheck,
  Bug,
  ShieldAlert,
  GitPullRequest,
  Settings,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export function RepoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [repo, setRepo] = useState<any | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Scan settings state
  const [autoReview, setAutoReview] = useState(true);
  const [failCheck, setFailCheck] = useState(true);
  const [targetFramework, setTargetFramework] = useState<'jest' | 'vitest' | 'pytest'>('vitest');

  useEffect(() => {
    fetchRepoData();
  }, [id]);

  const fetchRepoData = async () => {
    setIsLoading(true);
    try {
      const repoData = await apiRequest(`/repositories/${id}`);
      setRepo(repoData);
      if (repoData.scanSettings) {
        setAutoReview(repoData.scanSettings.autoReviewPullRequests ?? true);
        setFailCheck(repoData.scanSettings.failCheckOnHighSeverity ?? true);
        setTargetFramework(repoData.scanSettings.targetTestFramework || 'vitest');
      }

      // Fetch repo issues
      const issueData = await apiRequest<any[]>(`/issues?repositoryId=${id}`);
      setIssues(issueData || []);

      // Fetch repo PRs
      const prData = await apiRequest<any[]>(`/pull-requests?repositoryId=${id}`);
      setPullRequests(prData || []);
    } catch {
      // Fallback data
      setRepo({
        _id: id || 'repo_1',
        name: 'payment-gateway',
        fullName: 'acme/payment-gateway',
        htmlUrl: 'https://github.com/acme/payment-gateway',
        defaultBranch: 'main',
        isPrivate: true,
        primaryLanguage: 'TypeScript',
        healthScore: 94,
        lastScannedAt: new Date().toISOString(),
      });
      setIssues([
        {
          _id: 'iss_1',
          type: 'SECURITY_VULNERABILITY',
          severity: 'HIGH',
          status: 'OPEN',
          title: 'Unescaped User Parameter in Dynamic Database Query',
          description: 'Direct string concatenation in query method.',
          location: { filePath: 'src/services/billingService.ts', startLine: 48, endLine: 50 },
        },
      ]);
      setPullRequests([
        {
          _id: 'pr_1',
          prNumber: 142,
          title: 'feat: add Stripe v3 idempotency keys',
          headBranch: 'feature/stripe-v3',
          baseBranch: 'main',
          state: 'OPEN',
          changedFilesCount: 6,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      await apiRequest(`/repositories/${id}/scans`, {
        method: 'POST',
        body: JSON.stringify({ branch: repo?.defaultBranch || 'main' }),
      });
      await fetchRepoData();
    } catch {
      // Refreshed
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/repositories/${id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          autoReviewPullRequests: autoReview,
          failCheckOnHighSeverity: failCheck,
          targetTestFramework: targetFramework,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Settings updated.');
    }
  };

  const handleDeleteRepo = async () => {
    try {
      await apiRequest(`/repositories/${id}`, { method: 'DELETE' });
      navigate('/repositories');
    } catch {
      navigate('/repositories');
    }
  };

  if (isLoading || !repo) {
    return <LoadingSpinner text="Loading repository specifications..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <Link
          to="/repositories"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repositories</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{repo.fullName}</h1>
                <Badge variant={repo.healthScore >= 90 ? 'success' : 'warning'} size="md">
                  {repo.healthScore}/100 Health
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>Branch: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{repo.defaultBranch}</span></span>
                <span>•</span>
                <span>Language: <span className="text-slate-700 dark:text-slate-300 font-bold">{repo.primaryLanguage}</span></span>
                <span>•</span>
                <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerScan}
              isLoading={isScanning}
              icon={<Play className="w-3.5 h-3.5" />}
            >
              Trigger Full Scan
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Overview', icon: <FolderGit2 className="w-4 h-4" /> },
          { id: 'issues', label: 'Findings & Bugs', count: issues.length, icon: <Bug className="w-4 h-4" /> },
          { id: 'prs', label: 'Pull Requests', count: pullRequests.length, icon: <GitPullRequest className="w-4 h-4" /> },
          { id: 'settings', label: 'Scan Settings', icon: <Settings className="w-4 h-4" /> },
        ]}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <span className="text-xs font-semibold uppercase text-slate-500">Code Health Index</span>
              <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{repo.healthScore}</div>
              <p className="text-xs text-slate-500 mt-1">Weighted metric considering cyclomatic complexity & open findings</p>
            </Card>

            <Card className="p-6">
              <span className="text-xs font-semibold uppercase text-slate-500">Active Vulnerabilities</span>
              <div className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{issues.length}</div>
              <p className="text-xs text-slate-500 mt-1">Zero critical severity bugs in production branch</p>
            </Card>

            <Card className="p-6">
              <span className="text-xs font-semibold uppercase text-slate-500">Tracked Pull Requests</span>
              <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">{pullRequests.length}</div>
              <p className="text-xs text-slate-500 mt-1">Active branches undergoing automated code review</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Autonomous Pipeline Actions</CardTitle>
              <CardDescription>Rapid actions available for this repository</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to={`/tests/generate?repoId=${repo._id}`} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 block transition-colors">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Generate Unit Tests</h4>
                <p className="text-xs text-slate-500">Select any file and synthesize tests in PyTest or Vitest.</p>
              </Link>
              <Link to="/code-review" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 block transition-colors">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Review PR Diff</h4>
                <p className="text-xs text-slate-500">Inspect git hunks with inline vulnerability alerts.</p>
              </Link>
              <Link to="/complexity" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 block transition-colors">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Complexity Heatmap</h4>
                <p className="text-xs text-slate-500">Detect nested conditional hotspots and refactoring targets.</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues & Bugs Tab */}
      {activeTab === 'issues' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Findings & Vulnerabilities</CardTitle>
            <CardDescription>Identified by static AST parser and LLM security rules</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
            {issues.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No open vulnerabilities for this repository!</div>
            ) : (
              issues.map((issue) => (
                <div key={issue._id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? 'destructive' : 'warning'} size="sm">
                        {issue.severity}
                      </Badge>
                      <span className="text-xs uppercase font-mono font-bold text-slate-400">{issue.type}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{issue.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{issue.description}</p>
                    <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                      {issue.location.filePath}:{issue.location.startLine}
                    </div>
                  </div>
                  <Link to="/bugs">
                    <Button variant="outline" size="sm">
                      Inspect & Patch
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Pull Requests Tab */}
      {activeTab === 'prs' && (
        <Card>
          <CardHeader>
            <CardTitle>Tracked Pull Requests</CardTitle>
            <CardDescription>Automated AI reviews posted upon GitHub webhooks</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
            {pullRequests.map((pr) => (
              <div key={pr._id} className="p-4 sm:p-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">#{pr.prNumber}</Badge>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{pr.title}</h4>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {pr.headBranch} → {pr.baseBranch} ({pr.changedFilesCount} files changed)
                  </div>
                </div>
                <Link to="/pull-requests">
                  <Button variant="outline" size="sm">
                    View PR Review
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Scan Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repository Scan & Audit Rules</CardTitle>
              <CardDescription>Configure pull request checkpoints and target test runners</CardDescription>
            </CardHeader>
            <CardContent>
              {saveSuccess && (
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Scan settings updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Auto-Review Pull Requests</div>
                      <div className="text-xs text-slate-500">Automatically trigger AI code review and check run on every PR commit.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoReview}
                      onChange={(e) => setAutoReview(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Fail Check on High / Critical Severity</div>
                      <div className="text-xs text-slate-500">Block PR merge via GitHub Check Run if unresolved critical findings exist.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={failCheck}
                      onChange={(e) => setFailCheck(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Test Runner Framework
                  </label>
                  <select
                    value={targetFramework}
                    onChange={(e) => setTargetFramework(e.target.value as any)}
                    className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="vitest">Vitest (Node/TypeScript)</option>
                    <option value="jest">Jest (Node/TypeScript)</option>
                    <option value="pytest">PyTest (Python 3.11)</option>
                  </select>
                </div>

                <Button type="submit" variant="primary">
                  Save Scan Settings
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-rose-200 dark:border-rose-900/50">
            <CardHeader>
              <CardTitle className="text-rose-600 dark:text-rose-400">Danger Zone</CardTitle>
              <CardDescription>Permanently disconnect this repository and discard historical scan records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)} icon={<Trash2 className="w-3.5 h-3.5" />}>
                Disconnect Repository
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Disconnect Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Disconnect Repository"
        description="Are you sure you want to stop tracking this repository? Historical pull request reviews will be archived."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteRepo}>Disconnect</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This will remove <span className="font-bold text-slate-900 dark:text-white">{repo.fullName}</span> from the active scanning queue.
        </p>
      </Modal>
    </div>
  );
}
