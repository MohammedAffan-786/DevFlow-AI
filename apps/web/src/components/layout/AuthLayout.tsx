import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Code2, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function AuthLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Left Promotional / Showcase Column */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 text-white p-12 border-r border-slate-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Code2 className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight">DevFlow AI</span>
          </Link>
          <div className="mt-16 max-w-lg">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 mb-6">
              Autonomous Software Engineering
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Eliminate code review friction and vulnerability regressions.
            </h1>
            <p className="mt-4 text-slate-400 leading-relaxed text-sm">
              DevFlow AI pairs deterministic AST tree parsing with LLM reasoning inside ephemeral, hardened Docker sandboxes to autonomously audit pull requests and generate verified unit tests.
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">7-Tier Ephemeral Sandbox</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero network egress, read-only rootfs, and Seccomp syscall filtering for untrusted test executions.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">AST-Verified Vulnerability Auditing</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic line-level checking with zero-tolerance false-positive filtering.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} DevFlow AI Inc. Enterprise Ready.</span>
          <span>SOC 2 Type II Certified</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Code2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">DevFlow AI</span>
          </Link>
          <div className="ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
          By continuing, you agree to DevFlow AI's Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}
