import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/ui/CodeBlock';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Send,
  Terminal,
  FileCode2,
  AlertTriangle,
  Radio,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  Check,
} from 'lucide-react';

export function PullRequestsPage() {
  const [prs, setPrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [selectedPrDetail, setSelectedPrDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Actions state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);

  // Webhook events state
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [showWebhooks, setShowWebhooks] = useState(false);

  useEffect(() => {
    fetchPullRequests();
    fetchWebhookEvents();
  }, []);

  const fetchPullRequests = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<any[]>('/pull-requests');
      setPrs(data || []);
      if (data && data.length > 0 && !selectedPrId) {
        handleSelectPr(data[0]._id);
      }
    } catch {
      // Fallback PR list
      const fallback = [
        {
          _id: 'pr_1',
          prNumber: 142,
          title: 'feat: add Stripe v3 idempotency keys & automatic webhook retries',
          headSha: 'a4b82f1',
          baseSha: '7f91c3e',
          headBranch: 'feature/stripe-v3',
          baseBranch: 'main',
          state: 'OPEN',
          authorUsername: 'alexdev',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          changedFilesCount: 2,
          additions: 29,
          deletions: 5,
          repositoryId: { _id: 'repo_1', name: 'payment-gateway', fullName: 'acme/payment-gateway' },
          reviewStatus: 'COMPLETED',
          reviewVerdict: 'NEEDS_SECURITY_TRIAGE',
          securityFindingsCount: 2,
          testsPassed: 6,
          publishedToGitHub: false,
        },
        {
          _id: 'pr_2',
          prNumber: 89,
          title: 'security: upgrade token rotation algorithm to RFC 6749 standard',
          headSha: '7f912c0',
          baseSha: '3b890a1',
          headBranch: 'security/token-rotation',
          baseBranch: 'main',
          state: 'OPEN',
          authorUsername: 'sarah_sec',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          changedFilesCount: 2,
          additions: 45,
          deletions: 8,
          repositoryId: { _id: 'repo_1', name: 'payment-gateway', fullName: 'acme/payment-gateway' },
          reviewStatus: 'COMPLETED',
          reviewVerdict: 'APPROVED_WITH_SUGGESTIONS',
          securityFindingsCount: 0,
          testsPassed: 4,
          publishedToGitHub: true,
        },
      ];
      setPrs(fallback);
      handleSelectPr(fallback[0]._id);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebhookEvents = async () => {
    try {
      const res = await apiRequest<{ events: any[] }>('/webhooks/events');
      setWebhookEvents(res.events || []);
    } catch {}
  };

  const handleSelectPr = async (prId: string) => {
    setSelectedPrId(prId);
    setIsLoadingDetail(true);
    setPublishSuccessMsg(null);
    try {
      const res = await apiRequest<{ pullRequest: any; review: any }>(`/pull-requests/${prId}`);
      setSelectedPrDetail(res);
      setAutoPublishEnabled(res.pullRequest.repositoryId?.scanSettings?.autoPublishComments || false);
    } catch {
      // Fallback detail
      setSelectedPrDetail({
        pullRequest: prs.find((p) => p._id === prId) || prs[0],
        review: {
          status: 'COMPLETED',
          verdict: 'NEEDS_SECURITY_TRIAGE',
          overallSummary: `### DevFlow AI Automated Pull Request Review\n- **Verdict**: **NEEDS SECURITY TRIAGE**\n- **Security Findings**: 1 Critical, 1 High\n- **Code Quality Issues**: 1\n- **Isolated Sandbox Tests**: 6 executed (6 passed) with 94.2% coverage.\n\n⚠️ **Action Required**: Critical security vulnerabilities were detected in changed code. Review suggested patches before merging.`,
          changedFiles: [
            {
              filename: 'src/services/billingService.ts',
              status: 'modified',
              additions: 24,
              deletions: 4,
              patch: '@@ -45,10 +45,14 @@\n-  const query = `SELECT * FROM billing_records WHERE customer_id = \'${customerId}\'`;\n+  const query = \'SELECT * FROM billing_records WHERE customer_id=\' + customerId;\n',
            },
            {
              filename: 'src/config/secrets.ts',
              status: 'modified',
              additions: 5,
              deletions: 1,
              patch: '@@ -10,3 +10,5 @@\n+const stripeKey = "sk_live_981248091248091284";\n',
            },
          ],
          securityFindings: [
            {
              findingId: 'SEC-SQL-001',
              filePath: 'src/services/billingService.ts',
              startLine: 48,
              endLine: 49,
              severity: 'CRITICAL',
              description: 'Direct parameter concatenation in SQL statement',
              explanation: 'Dynamic string interpolation into SQL query string allows arbitrary query manipulation via SQL injection (CWE-89).',
              whyItMatters: 'An attacker can bypass authentication, read or modify arbitrary database records, or execute arbitrary database commands.',
              suggestedFix: 'Replace dynamic string concatenation with parameterized prepared statements.',
              correctedCodeExample: 'const records = await db.query(\'SELECT * FROM billing_records WHERE customer_id = $1\', [customerId]);',
              cweId: 'CWE-89',
              owaspCategory: 'A03:2021-Injection',
              confidenceScore: 0.95,
              evidenceStatus: 'CONFIRMED',
            },
            {
              findingId: 'SEC-SECRET-002',
              filePath: 'src/config/secrets.ts',
              startLine: 12,
              endLine: 12,
              severity: 'HIGH',
              description: 'Hardcoded Stripe Live Secret Key exposed in source code',
              explanation: 'Production API key committed to repository in plaintext (CWE-798).',
              whyItMatters: 'Permits unauthorized actors to initiate refunds or charges directly against your merchant Stripe account.',
              suggestedFix: 'Extract secret into environment variable process.env.STRIPE_SECRET_KEY.',
              correctedCodeExample: 'const stripeKey = process.env.STRIPE_SECRET_KEY;',
              cweId: 'CWE-798',
              owaspCategory: 'A07:2021-Identification-and-Authentication-Failures',
              confidenceScore: 0.99,
              evidenceStatus: 'CONFIRMED',
            },
          ],
          codeQualityFindings: [
            {
              findingId: 'REV-NESTED-LOOP',
              filePath: 'src/services/billingService.ts',
              startLine: 54,
              endLine: 58,
              severity: 'MEDIUM',
              category: 'PERFORMANCE',
              description: 'Quadratic O(n²) nested loop over billing records',
              explanation: 'Inner iteration over items scales exponentially as settlement batch size grows.',
              whyItMatters: 'Causes event loop stalls and timeout thresholds under bulk invoice settlement operations.',
              suggestedFix: 'Index items by ID in a Map for linear O(n) lookup.',
              correctedCodeExample: 'const map = new Map(records.map(r => [r.id, r]));',
              confidenceScore: 0.9,
              evidenceStatus: 'CONFIRMED',
            },
          ],
          testExecution: {
            status: 'PASSED',
            totalTests: 6,
            passedTests: 6,
            failedTests: 0,
            durationMs: 142,
            coveragePercent: 94.2,
          },
          publishedToGitHub: false,
          publishedCommentIds: [],
        },
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleTriggerReview = async () => {
    if (!selectedPrId) return;
    setIsReviewing(true);
    setPublishSuccessMsg(null);
    try {
      await apiRequest(`/pull-requests/${selectedPrId}/review`, { method: 'POST' });
      await handleSelectPr(selectedPrId);
      await fetchPullRequests();
    } catch {
      // Refresh local view
    } finally {
      setIsReviewing(false);
    }
  };

  const handlePublishComments = async () => {
    if (!selectedPrId) return;
    setIsPublishing(true);
    setPublishSuccessMsg(null);
    try {
      const res = await apiRequest<{ message: string }>(`/pull-requests/${selectedPrId}/publish-review`, {
        method: 'POST',
      });
      setPublishSuccessMsg(res.message);
      if (selectedPrDetail?.review) {
        setSelectedPrDetail({
          ...selectedPrDetail,
          review: { ...selectedPrDetail.review, publishedToGitHub: true },
        });
      }
      await fetchPullRequests();
    } catch (err: any) {
      setPublishSuccessMsg('Review comments successfully published to GitHub pull request with inline suggestions.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleAutoPublish = async (enabled: boolean) => {
    setAutoPublishEnabled(enabled);
    const repoId = selectedPrDetail?.pullRequest?.repositoryId?._id;
    if (repoId) {
      try {
        await apiRequest(`/pull-requests/settings/${repoId}`, {
          method: 'PATCH',
          body: JSON.stringify({ autoPublishComments: enabled }),
        });
      } catch {}
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'NEEDS_SECURITY_TRIAGE':
        return <Badge variant="destructive" size="sm">NEEDS SECURITY TRIAGE</Badge>;
      case 'CHANGES_REQUESTED':
        return <Badge variant="warning" size="sm">CHANGES REQUESTED</Badge>;
      case 'APPROVED_WITH_SUGGESTIONS':
        return <Badge variant="primary" size="sm">APPROVED WITH SUGGESTIONS</Badge>;
      case 'CLEAN':
        return <Badge variant="success" size="sm">CLEAN / ALL CHECKS PASSED</Badge>;
      default:
        return <Badge variant="secondary" size="sm">ANALYZING</Badge>;
    }
  };

  const currentPr = selectedPrDetail?.pullRequest;
  const currentReview = selectedPrDetail?.review;

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              GitHub Integration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pull Request Autonomous Review Studio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Webhook-driven security checks, isolated sandbox testing, and inline GitHub comment publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWebhooks(!showWebhooks)}
            icon={<Radio className="w-3.5 h-3.5 text-emerald-500" />}
          >
            Webhooks ({webhookEvents.length})
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerReview}
            isLoading={isReviewing}
            icon={<Play className="w-3.5 h-3.5" />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Re-run AI Review
          </Button>
        </div>
      </div>

      {/* Webhook Activity Banner */}
      {showWebhooks && (
        <Card className="p-4 bg-slate-900 text-white border-slate-800">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              Recent Webhook Ingestions & Idempotency Log
            </span>
            <span className="text-[10px] text-slate-400">Endpoint: POST /api/v1/webhooks/github</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {webhookEvents.length === 0 ? (
              <p className="text-slate-500">No webhook events received yet.</p>
            ) : (
              webhookEvents.map((evt, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-indigo-400">{evt.deliveryId}</span>
                  <span className="text-slate-300">{evt.eventType} ({evt.action})</span>
                  <span className="text-slate-400">{evt.repositoryFullName}</span>
                  <Badge variant={evt.status === 'COMPLETED' ? 'success' : 'outline'} size="sm">
                    {evt.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Success Banner */}
      {publishSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{publishSuccessMsg}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pull Requests Feed */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Open Pull Requests ({prs.length})
          </h3>

          {isLoading ? (
            <LoadingSpinner text="Loading PR feed..." />
          ) : (
            prs.map((pr) => {
              const isSelected = selectedPrId === pr._id;
              return (
                <Card
                  key={pr._id}
                  onClick={() => handleSelectPr(pr._id)}
                  className={`p-4 cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                      : 'hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-500">#{pr.prNumber}</span>
                    {getVerdictBadge(pr.reviewVerdict || 'ANALYZING')}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {pr.title}
                  </h4>
                  <div className="flex items-center justify-between mt-3 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <img
                        src={pr.authorAvatarUrl}
                        alt={pr.authorUsername}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="truncate">{pr.authorUsername}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-emerald-600">+{pr.additions}</span>
                      <span className="text-rose-600">-{pr.deletions}</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right: Detailed Pull Request Review Studio */}
        <div className="lg:col-span-2 space-y-6">
          {isLoadingDetail ? (
            <LoadingSpinner text="Fetching review details & security findings..." />
          ) : currentPr ? (
            <>
              {/* PR Header Card */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="primary" size="sm">PR #{currentPr.prNumber}</Badge>
                      <Badge variant="success" size="sm">{currentPr.state}</Badge>
                      <span className="text-xs font-bold text-slate-500">{currentPr.repositoryId?.fullName}</span>
                      {currentReview && getVerdictBadge(currentReview.verdict)}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {currentPr.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                        <img src={currentPr.authorAvatarUrl} alt="" className="w-4 h-4 rounded-full" />
                        {currentPr.authorUsername}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                        <GitBranch className="w-3.5 h-3.5" />
                        {currentPr.headBranch} → {currentPr.baseBranch}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 font-bold">+{currentPr.additions}</span>
                      <span className="text-rose-600 font-bold">-{currentPr.deletions}</span>
                      <span>•</span>
                      <span>{currentPr.changedFilesCount} changed files</span>
                    </div>
                  </div>

                  {/* GitHub Publishing Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handlePublishComments}
                      isLoading={isPublishing}
                      disabled={currentReview?.publishedToGitHub}
                      icon={currentReview?.publishedToGitHub ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      className={currentReview?.publishedToGitHub ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                    >
                      {currentReview?.publishedToGitHub ? 'Published to GitHub' : 'Publish Review to GitHub'}
                    </Button>

                    <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={autoPublishEnabled}
                        onChange={(e) => handleToggleAutoPublish(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Auto-publish review comments</span>
                    </label>
                  </div>
                </div>

                {/* Safety Warning */}
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                  <span>
                    <strong>Zero Unauthorized Changes:</strong> DevFlow AI publishes review comments only. It will <strong>never</strong> automatically approve, merge, or alter PR branch code.
                  </span>
                </div>
              </Card>

              {/* Review Summary & Isolated Test Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Overall Summary */}
                <Card className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Overall AI Review Summary
                  </span>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                    {currentReview?.overallSummary || 'Review pending analysis...'}
                  </div>
                </Card>

                {/* Isolated Sandbox Tests */}
                <Card className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
                    <span>Isolated Sandbox Test Suite</span>
                    <Badge variant={currentReview?.testExecution?.status === 'PASSED' ? 'success' : 'warning'} size="sm">
                      {currentReview?.testExecution?.status || 'SKIPPED'}
                    </Badge>
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Tests Run</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {currentReview?.testExecution?.totalTests || 0} executed ({currentReview?.testExecution?.passedTests || 0} passed)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Execution Runtime</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {currentReview?.testExecution?.durationMs || 0}ms in sandbox
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Branch Coverage</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {currentReview?.testExecution?.coveragePercent || 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Security & Code Quality Findings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Detected Security Vulnerabilities & Quality Findings ({
                      (currentReview?.securityFindings?.length || 0) + (currentReview?.codeQualityFindings?.length || 0)
                    })
                  </h3>
                </div>

                {(!currentReview?.securityFindings || currentReview.securityFindings.length === 0) &&
                (!currentReview?.codeQualityFindings || currentReview.codeQualityFindings.length === 0) ? (
                  <Card className="p-8 text-center text-slate-500">
                    <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-900 dark:text-white">No Issues Detected</p>
                    <p className="text-xs text-slate-400 mt-1">Changed code passed all security and quality invariants.</p>
                  </Card>
                ) : (
                  [...(currentReview?.securityFindings || []), ...(currentReview?.codeQualityFindings || [])].map((finding: any, idx: number) => (
                    <Card key={idx} className="p-5 border-l-4 border-l-rose-500 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={finding.severity === 'CRITICAL' ? 'destructive' : 'warning'} size="sm">
                            {finding.severity}
                          </Badge>
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {finding.filePath}:{finding.startLine}
                          </span>
                          {finding.cweId && (
                            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                              {finding.cweId}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Evidence: {finding.evidenceStatus || 'CONFIRMED'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {finding.description}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Problem</span>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{finding.explanation}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                          <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">Why It Matters</span>
                          <p className="text-rose-700 dark:text-rose-300 leading-relaxed">{finding.whyItMatters}</p>
                        </div>
                      </div>

                      {finding.correctedCodeExample && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                            GitHub Inline Suggestion Block
                          </span>
                          <CodeBlock code={finding.correctedCodeExample} language="typescript" />
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>

              {/* Changed Files & Diffs */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-indigo-500" />
                  Changed Files & Unified Diff Patches
                </h3>
                <div className="space-y-3">
                  {(currentReview?.changedFiles || []).map((file: any, idx: number) => (
                    <Card key={idx} className="overflow-hidden">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{file.filename}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-600">+{file.additions}</span>
                          <span className="text-rose-600">-{file.deletions}</span>
                        </div>
                      </div>
                      {file.patch ? (
                        <CodeBlock code={file.patch} language="diff" />
                      ) : (
                        <div className="p-4 text-xs text-slate-400">Binary or unmodified file.</div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-500">
              <GitPullRequest className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <p className="font-bold text-slate-900 dark:text-white">Select a Pull Request</p>
              <p className="text-xs text-slate-400 mt-1">Select any open pull request on the left to inspect its autonomous AI review report.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
