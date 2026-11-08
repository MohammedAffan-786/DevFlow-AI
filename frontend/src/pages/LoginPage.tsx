import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Github, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginInput, setLoginInput] = useState('alex.dev@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginInput.trim()) {
      setError('Email or username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginInput, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsGitHubLoading(true);
    try {
      const data = await apiRequest<{ url: string }>('/auth/github/url');
      if (data && data.url) {
        // In real environment, redirect to GitHub OAuth
        // For development test flow, exchange mock token directly
        await apiRequest('/auth/github/callback', {
          method: 'POST',
          body: JSON.stringify({ code: 'demo_github_oauth_code' }),
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('GitHub authentication failed: ' + (err.message || 'OAuth error'));
    } finally {
      setIsGitHubLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Sign in to your DevFlow AI workspace to inspect code and security health.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* GitHub OAuth Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 border-slate-300 dark:border-slate-800"
        onClick={handleGitHubLogin}
        isLoading={isGitHubLoading}
        icon={<Github className="w-4 h-4" />}
      >
        Continue with GitHub
      </Button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
        <span className="bg-slate-50 dark:bg-slate-950 px-3 text-xs uppercase text-slate-400 font-semibold absolute">
          Or continue with email
        </span>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email or Username"
          type="text"
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
          placeholder="name@company.com or username"
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full h-11"
          isLoading={isLoading}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      {/* Demo Credentials Tip */}
      <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
        <Check className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
        <div>
          <span className="font-bold">Pre-configured Demo Account:</span>
          <div className="mt-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            alex.dev@acme.com / Password123!
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
