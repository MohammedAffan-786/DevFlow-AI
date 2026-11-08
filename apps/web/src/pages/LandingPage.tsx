import React from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  ShieldCheck,
  Terminal,
  Cpu,
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <nav className="h-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <Code2 className="w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">DevFlow AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <a href="#sandbox" className="hover:text-white transition-colors">Hardened Sandbox</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 sm:px-12 pt-20 pb-28 max-w-6xl mx-auto text-center overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 mb-8 animate-in fade-in-0 slide-in-from-top-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Production Autonomous Software Engineering Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight sm:leading-none text-white max-w-4xl mx-auto">
          AI Code Intelligence with <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Deterministic Sandbox Execution</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          DevFlow AI automatically reviews GitHub pull requests, detects critical vulnerabilities, calculates cyclomatic complexity, and synthesizes unit tests verified inside isolated Docker containers.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg" icon={<Zap className="w-5 h-5" />}>
              Start Autonomous Code Analysis
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="lg">
              Explore Live Demo Dashboard
            </Button>
          </Link>
        </div>

        {/* Live Code Preview Mockup */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-4 sm:p-6 text-left max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-slate-300">src/services/billing.ts (Pull Request #142)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold text-[10px]">
              VERIFIED GREEN IN SANDBOX
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-rose-300">
              <span className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-wider">Before: SQL Injection Vulnerability</span>
              <code>
                {`// Unsafe dynamic query\nconst query = \`SELECT * FROM users\n  WHERE id = '\${req.body.id}'\`;\nconst user = await db.raw(query);`}
              </code>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/50 text-emerald-300">
              <span className="text-[10px] text-emerald-500 block mb-2 uppercase font-bold tracking-wider">DevFlow AI Verified Fix & PyTest Suite</span>
              <code>
                {`// Parameterized statement\nconst user = await db('users')\n  .where({ id: req.body.id })\n  .first();\n// 4 Unit Tests Passing (84ms)`}
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 sm:px-12 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">Full-Spectrum Code Quality Assurance</h2>
            <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
              Every layer engineered to prevent regressions, stop container breakout attacks, and enforce strict maintainability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all">
              <div className="p-3 w-fit rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800 mb-6">
                <GitPullRequest className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Automated PR Code Reviews</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Connects directly to GitHub Webhooks. Analyzes git diffs against repository context and posts inline comments with copyable patches.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all">
              <div className="p-3 w-fit rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800 mb-6">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Sandboxed Unit Test Studio</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Generates PyTest, Vitest, and Jest test suites. Ephemeral Docker containers verify green execution before proposing code changes.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all">
              <div className="p-3 w-fit rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">SAST & OWASP Detection</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Identifies SQLi, SSRF, XSS, and hardcoded secrets. Hallucination filter ensures flagged identifiers exist in physical AST.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 px-6 sm:px-12 text-center text-xs text-slate-500">
        <div className="flex justify-center items-center gap-6 mb-4">
          <Link to="/login" className="hover:text-slate-300">Login</Link>
          <Link to="/register" className="hover:text-slate-300">Register</Link>
          <Link to="/dashboard" className="hover:text-slate-300">Dashboard</Link>
          <Link to="/security" className="hover:text-slate-300">Security</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} DevFlow AI Inc. Designed for high-velocity software engineering teams.</p>
      </footer>
    </div>
  );
}
