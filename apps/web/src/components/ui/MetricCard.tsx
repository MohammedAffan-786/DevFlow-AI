import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  accentColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan';
}

export function MetricCard({ title, value, subtext, trend, icon, accentColor = 'indigo' }: MetricCardProps) {
  const accentClasses = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-100 dark:border-cyan-900',
  };

  return (
    <Card className="p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2">
            {value}
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${accentClasses[accentColor]} transition-transform group-hover:scale-105`}>
          {icon}
        </div>
      </div>

      {(trend || subtext) && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          {trend && (
            <span
              className={`flex items-center gap-0.5 font-semibold ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend.value}
            </span>
          )}
          {subtext && <span className="text-slate-500 dark:text-slate-400">{subtext}</span>}
        </div>
      )}
    </Card>
  );
}
