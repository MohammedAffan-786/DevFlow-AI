import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import {
  Settings,
  Github,
  Key,
  Bell,
  CheckCircle2,
  Copy,
  Check,
  Shield,
  Layers,
} from 'lucide-react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('integrations');

  // Integrations state
  const [githubAppId, setGithubAppId] = useState('123456');
  const [webhookSecret, setWebhookSecret] = useState('whsec_89f012c84910ae23');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // API Key state
  const [apiKeys, setApiKeys] = useState([
    { id: 'key_1', name: 'CI/CD GitHub Actions Token', prefix: 'df_live_89f...', createdAt: '2026-11-01' },
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // General Notification Preferences
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyPRReviews, setNotifyPRReviews] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const webhookUrl = `${window.location.origin}/api/v1/webhooks/github`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const rawKey = `df_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    setApiKeys((prev) => [
      ...prev,
      {
        id: `key_${Date.now()}`,
        name: newKeyName,
        prefix: `${rawKey.substring(0, 10)}...`,
        createdAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setGeneratedKey(rawKey);
    setNewKeyName('');
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-0 duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure GitHub App integrations, generate programmatic API tokens, and set audit thresholds.
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'integrations', label: 'GitHub Integrations', icon: <Github className="w-4 h-4" /> },
          { id: 'apikeys', label: 'API Keys & Secrets', icon: <Key className="w-4 h-4" /> },
          { id: 'preferences', label: 'Notifications & Alerts', icon: <Bell className="w-4 h-4" /> },
        ]}
      />

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GitHub App & Webhook Ingress</CardTitle>
                  <CardDescription>Continuous bidirectional sync for check runs and PR comments</CardDescription>
                </div>
                <Badge variant="success" size="sm">Connected</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="GitHub App ID"
                value={githubAppId}
                onChange={(e) => setGithubAppId(e.target.value)}
                readOnly
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Webhook Payload URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-3.5 py-2 text-slate-600 dark:text-slate-400 select-all"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyWebhook} icon={<Copy className="w-3.5 h-3.5" />}>
                    {copiedSecret ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <Input
                label="Webhook HMAC SHA-256 Secret"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />

              <Button variant="primary" size="sm" onClick={() => alert('Webhook configuration saved.')}>
                Save Integration Config
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Programmatic API Tokens</CardTitle>
              <CardDescription>Authenticate CI/CD pipelines (GitHub Actions, GitLab CI) with DevFlow AI APIs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {generatedKey && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                  <span className="font-bold block">Token Created! Copy this now; it will not be displayed again:</span>
                  <div className="font-mono p-2 bg-emerald-900/40 rounded border border-emerald-800 text-white select-all">
                    {generatedKey}
                  </div>
                </div>
              )}

              <form onSubmit={handleGenerateKey} className="flex gap-3">
                <Input
                  placeholder="Token Description (e.g. Production Jenkins)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" className="flex-shrink-0">
                  Generate Key
                </Button>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{k.name}</h4>
                      <span className="text-xs font-mono text-slate-400">Created {k.createdAt}</span>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {k.prefix}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Triggers & Channels</CardTitle>
            <CardDescription>Control alerts delivered via email and in-app feeds</CardDescription>
          </CardHeader>
          <CardContent>
            {saveSuccess && (
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preferences saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Critical Security Alerts</div>
                  <div className="text-xs text-slate-500">Dispatch immediate notifications when high or critical CWE flaws are uncovered.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyCritical}
                  onChange={(e) => setNotifyCritical(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Pull Request Review Summaries</div>
                  <div className="text-xs text-slate-500">Notify author when an automated review is posted to GitHub.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyPRReviews}
                  onChange={(e) => setNotifyPRReviews(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <Button type="submit" variant="primary">
                Save Preferences
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
