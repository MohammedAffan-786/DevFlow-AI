import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/ui/CodeBlock';
import {
  FileCode2,
  GitPullRequest,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Play,
} from 'lucide-react';

export function CodeReviewPage() {
  const [selectedFile, setSelectedFile] = useState('src/services/billingService.ts');
  const [isReviewing, setIsReviewing] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [applied, setApplied] = useState(false);

  const modifiedFiles = [
    { name: 'src/services/billingService.ts', additions: 42, deletions: 12, issues: 2 },
    { name: 'src/webhooks/stripeDispatcher.ts', additions: 18, deletions: 4, issues: 1 },
    { name: 'src/handlers/paymentIntent.ts', additions: 65, deletions: 20, issues: 0 },
  ];

  const diffContent = `@@ -45,10 +45,12 @@ export async function processCustomerBilling(customerId: string) {
   const customer = await findCustomer(customerId);
   if (!customer) throw new NotFoundError('Customer not found');

-  // Potential SQL Injection vulnerability via unescaped interpolation
-  const query = \`SELECT * FROM billing_records WHERE customer_id = '\${customerId}'\`;
-  const records = await db.raw(query);
+  // Parameterized query guarding against arbitrary input injection
+  const records = await db('billing_records')
+    .where({ customer_id: customerId })
+    .select('*');

   return calculateProratedAmount(records);
 }`;

  const suggestedPatch = `const records = await db('billing_records')
  .where({ customer_id: customerId })
  .select('*');`;

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(suggestedPatch);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleApplyFix = () => {
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const handleTriggerReview = () => {
    setIsReviewing(true);
    setTimeout(() => setIsReviewing(false), 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" size="sm">PR #142</Badge>
            <span className="text-xs font-mono text-slate-500">feature/stripe-v3 → main</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            AI Pull Request Review Studio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Autonomous line-level code review, logic analysis, and patch suggestions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerReview}
            isLoading={isReviewing}
            icon={<Play className="w-3.5 h-3.5" />}
          >
            Re-run AI Review
          </Button>
        </div>
      </div>

      {/* Main Review Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left File Tree Selector */}
        <Card className="lg:col-span-1 p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Modified Files (3)</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {modifiedFiles.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file.name)}
                className={`w-full text-left p-3.5 transition-colors flex items-center justify-between text-xs ${
                  selectedFile === file.name
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-l-4 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="truncate font-mono">{file.name.split('/').pop()}</div>
                  <div className="text-[10px] text-slate-400 truncate">{file.name}</div>
                </div>
                {file.issues > 0 && (
                  <Badge variant="destructive" size="sm">{file.issues}</Badge>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Right Diff Viewer & AI Findings Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Finding Alert Callout */}
          <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" size="sm">SECURITY_VULNERABILITY</Badge>
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300">CWE-89: SQL Injection Vector</span>
              </div>
              <span className="text-xs font-mono text-slate-500">Lines 48-50</span>
            </div>

            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              Direct string concatenation in database query allows arbitrary statement injection if input bypasses frontend sanitization.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyFix}
                icon={applied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              >
                {applied ? 'Patch Applied to PR' : 'Apply AI Suggested Patch'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyDiff}
                icon={<Copy className="w-3.5 h-3.5" />}
              >
                {copiedDiff ? 'Copied' : 'Copy Patch Diff'}
              </Button>
            </div>
          </div>

          {/* Unified Diff Box */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{selectedFile}</span>
              <span className="text-xs text-slate-400">Git Unified Diff Viewer</span>
            </div>
            <CodeBlock code={diffContent} language="diff" filename={selectedFile} />
          </Card>
        </div>
      </div>
    </div>
  );
}
