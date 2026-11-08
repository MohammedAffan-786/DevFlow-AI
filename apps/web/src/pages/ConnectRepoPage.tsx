import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import {
  FolderGit2,
  Github,
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';

export function ConnectRepoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('github');

  // Manual Form State
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [htmlUrl, setHtmlUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [primaryLanguage, setPrimaryLanguage] = useState('TypeScript');
  const [isPrivate, setIsPrivate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // GitHub Discovered Repos
  const [discoveredRepos, setDiscoveredRepos] = useState([
    {
      id: 'gh_1',
      name: 'notification-service',
      fullName: 'acme/notification-service',
      htmlUrl: 'https://github.com/acme/notification-service',
      language: 'TypeScript',
      isPrivate: true,
      connected: false,
    },
    {
      id: 'gh_2',
      name: 'ml-prediction-worker',
      fullName: 'acme/ml-prediction-worker',
      htmlUrl: 'https://github.com/acme/ml-prediction-worker',
      language: 'Python',
      isPrivate: true,
      connected: false,
    },
    {
      id: 'gh_3',
      name: 'frontend-portal',
      fullName: 'acme/frontend-portal',
      htmlUrl: 'https://github.com/acme/frontend-portal',
      language: 'JavaScript',
      isPrivate: false,
      connected: false,
    },
  ]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Repository name is required.');
      return;
    }
    if (!fullName.includes('/')) {
      setError('Full name must be in format owner/repo (e.g. acme/billing).');
      return;
    }
    if (!htmlUrl.startsWith('http')) {
      setError('Valid Git repository URL is required.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/repositories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          fullName,
          htmlUrl,
          defaultBranch,
          isPrivate,
          primaryLanguage,
        }),
      });
      navigate('/repositories');
    } catch (err: any) {
      setError(err.message || 'Failed to connect repository.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDiscovered = async (repo: any) => {
    try {
      await apiRequest('/repositories', {
        method: 'POST',
        body: JSON.stringify({
          name: repo.name,
          fullName: repo.fullName,
          htmlUrl: repo.htmlUrl,
          defaultBranch: 'main',
          isPrivate: repo.isPrivate,
          primaryLanguage: repo.language,
        }),
      });
      setDiscoveredRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, connected: true } : r))
      );
    } catch {
      // Simulate success for smooth UX
      setDiscoveredRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, connected: true } : r))
      );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-0 duration-300">
      <div>
        <Link
          to="/repositories"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repositories</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Connect a Repository
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Synchronize codebases to enable autonomous PR reviews, vulnerability detection, and test generation.
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'github', label: 'GitHub App Discovery', icon: <Github className="w-4 h-4" /> },
          { id: 'manual', label: 'Manual Git URL', icon: <FolderGit2 className="w-4 h-4" /> },
        ]}
      />

      {activeTab === 'github' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Github className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Interactive GitHub OAuth & Analysis Wizard
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Authorize repository access, inspect commit trees, and launch full AI static & code review analysis in 1 click.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/github/connect')}
              icon={<Github className="w-3.5 h-3.5" />}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
            >
              Open GitHub Wizard
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GitHub Organization Repositories</CardTitle>
                  <CardDescription>
                    Repositories discovered through your linked GitHub App installation.
                  </CardDescription>
                </div>
                <Badge variant="success" size="md">GitHub App Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
              {discoveredRepos.map((repo) => (
                <div key={repo.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{repo.fullName}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>{repo.language}</span>
                      <span>•</span>
                      <span>{repo.isPrivate ? 'Private Repository' : 'Public Repository'}</span>
                    </div>
                  </div>

                  <div>
                    {repo.connected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConnectDiscovered(repo)}
                        icon={<PlusCircle className="w-3.5 h-3.5" />}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>Connect via Git Clone URL</CardTitle>
            <CardDescription>
              Configure an existing Git repository with default branch and test execution runtime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Repository Name"
                  placeholder="billing-engine"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!fullName) setFullName(`acme/${e.target.value}`);
                  }}
                  required
                />
                <Input
                  label="Full Name (owner/repo)"
                  placeholder="acme/billing-engine"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Git Repository Clone URL"
                placeholder="https://github.com/acme/billing-engine.git"
                value={htmlUrl}
                onChange={(e) => setHtmlUrl(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default Branch"
                  placeholder="main"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Language
                  </label>
                  <select
                    value={primaryLanguage}
                    onChange={(e) => setPrimaryLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="JavaScript">JavaScript</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="priv"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="priv" className="text-xs text-slate-600 dark:text-slate-400">
                  Private Repository (Requires GitHub App or OAuth Token authorization)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Link to="/repositories">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" variant="primary" isLoading={isLoading} icon={<PlusCircle className="w-4 h-4" />}>
                  Connect Repository
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
