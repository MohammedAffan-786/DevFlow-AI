import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  FolderGit2,
  PlusCircle,
  Play,
  Search,
  Lock,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function RepositoriesPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest<any[]>('/repositories');
      setRepos(data || []);
    } catch (err: any) {
      setRepos([]);
      setLoadError(err?.message || 'Could not load repositories.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerScan = async (repoId: string) => {
    setScanningId(repoId);
    try {
      await apiRequest(`/repositories/${repoId}/scans`, {
        method: 'POST',
        body: JSON.stringify({ branch: 'main' }),
      });
      await fetchRepositories();
    } catch (err: any) {
      setLoadError(err?.message || 'Could not start the repository scan.');
    } finally {
      setScanningId(null);
    }
  };

  const filteredRepos = repos.filter((r) => {
    const matchesSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLang = languageFilter === 'ALL' || r.primaryLanguage === languageFilter;
    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Repositories & Codebases
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage synchronized GitHub repositories, scan configurations, and quality thresholds.
          </p>
        </div>

        <Link to="/repositories/connect">
          <Button variant="primary" size="md" icon={<PlusCircle className="w-4 h-4" />}>
            Connect New Repository
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter repositories by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'TypeScript', 'Python', 'JavaScript'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguageFilter(lang)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                languageFilter === lang
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching monitored repositories..." />
      ) : loadError ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p>{loadError}</p>
            <button type="button" onClick={fetchRepositories} className="mt-2 font-semibold underline">
              Try again
            </button>
          </div>
        </div>
      ) : filteredRepos.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="w-8 h-8" />}
          title="No repositories found"
          description="We couldn't find any repositories matching your search criteria. Connect a new repository to get started."
          actionText="Connect Repository"
          onAction={() => (window.location.href = '/repositories/connect')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo) => (
            <Card key={repo._id} className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {repo.isPrivate ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                      {repo.primaryLanguage}
                    </span>
                  </div>
                  <Badge variant={repo.healthScore >= 90 ? 'success' : 'warning'} size="sm">
                    {repo.healthScore}/100 Score
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-base">
                  <Link to={`/repositories/${repo._id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                    {repo.fullName}
                  </Link>
                </CardTitle>
                <CardDescription>
                  Default branch: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{repo.defaultBranch}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 pb-4">
                <div className="text-xs text-slate-500 space-y-1">
                  <div>
                    Last full scan:{' '}
                    <span className="text-slate-700 dark:text-slate-300">
                      {repo.lastScannedAt ? new Date(repo.lastScannedAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Automated PR reviews active</span>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
                <Link to={`/repositories/${repo._id}/analysis`}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Play className="w-3.5 h-3.5 text-indigo-500" />}
                  >
                    Full Analysis
                  </Button>
                </Link>
                <Link to={`/repositories/${repo._id}`}>
                  <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
