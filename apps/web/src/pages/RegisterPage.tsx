import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Github, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  const handleGitHubSignup = async () => {
    setError(null);
    setIsGitHubLoading(true);
    try {
      const { url } = await apiRequest<{ url: string }>('/auth/github/url');
      if (!url) throw new Error('GitHub authorization URL was not returned.');
      window.location.assign(url);
    } catch (err: any) {
      setError(err.message || 'GitHub authentication could not be started.');
      setIsGitHubLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid corporate email address.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your full or display name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!agreed) {
      setError('You must accept the terms of service.');
      return;
    }

    setIsLoading(true);
    try {
      await register({ email, username, displayName, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Create your developer account
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Get started with automated PR reviews and hardened Docker sandbox test generation.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 border-slate-300 dark:border-slate-800"
        isLoading={isGitHubLoading}
        icon={<Github className="w-4 h-4" />}
        onClick={handleGitHubSignup}
      >
        Sign up with GitHub
      </Button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
        <span className="bg-slate-50 dark:bg-slate-950 px-3 text-xs uppercase text-slate-400 font-semibold absolute">
          Or register with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Corporate Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="developer@company.com"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndev"
            required
          />
          <Input
            label="Full Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>

        <Input
          label="Password (min 8 characters)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
          />
          <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400">
            I agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full h-11"
          isLoading={isLoading}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Create Free Account
        </Button>
      </form>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
