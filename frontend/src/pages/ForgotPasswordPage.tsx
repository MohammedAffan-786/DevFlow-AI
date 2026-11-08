import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest<{ resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccessToken(res?.resetToken || 'demo_token_12345');
    } catch (err: any) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Reset your password
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Enter your registered email address and we&apos;ll send instructions to reset your password.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successToken ? (
        <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset instructions dispatched</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            A password reset email has been sent to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>.
          </p>
          <div className="pt-2">
            <Link to={`/reset-password?token=${successToken}`}>
              <Button variant="primary" size="sm" className="w-full">
                Proceed to Reset Password Page
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Account Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@company.com"
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11"
            isLoading={isLoading}
            icon={<Mail className="w-4 h-4" />}
          >
            Send Password Reset Link
          </Button>
        </form>
      )}
    </div>
  );
}
