import React, { useState } from 'react';

export interface TrendPoint {
  date: string;
  qualityScore: number;
  bugsCount: number;
  vulnCount: number;
}

export function QualityTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-center p-8 text-slate-400">No trend data available</div>;
  }

  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minScore = 60;
  const maxScore = 100;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (score: number) =>
    padding.top + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.qualityScore)}`).join(' ');
  const areaPoints = `${getX(0)},${padding.top + chartHeight} ${points} ${getX(data.length - 1)},${padding.top + chartHeight}`;

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[70, 80, 90, 100].map((level) => {
          const y = getY(level);
          return (
            <g key={level}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
              >
                {level}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#qualityGradient)" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Interactive points & hover anchors */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.qualityScore);
          const isHovered = hoverIndex === i;

          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              {/* Invisible touch/hover target */}
              <circle cx={cx} cy={cy} r="16" fill="transparent" />

              {/* Point circle */}
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? '6' : '4'}
                className="transition-all duration-150"
                fill={isHovered ? '#4f46e5' : '#6366f1'}
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Date labels on X-axis */}
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-colors ${
                  isHovered ? 'fill-indigo-600 dark:fill-indigo-400 font-bold' : 'fill-slate-400 dark:fill-slate-500'
                }`}
              >
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-10 p-3 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-xl pointer-events-none text-xs transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(getX(hoverIndex!) / width) * 100}%`,
            top: `${(getY(hoverItem(hoverIndex!).qualityScore) / height) * 100 - 10}%`,
          }}
        >
          <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 flex justify-between gap-4">
            <span>{hoveredItem.date}</span>
            <span className="text-indigo-400 font-bold">{hoveredItem.qualityScore}/100</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-emerald-400">
              <span>Bugs Active:</span>
              <span className="font-mono">{hoveredItem.bugsCount}</span>
            </div>
            <div className="flex justify-between gap-4 text-rose-400">
              <span>Vulnerabilities:</span>
              <span className="font-mono">{hoveredItem.vulnCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function hoverItem(idx: number) {
    return data[idx];
  }
}

export function VulnerabilityBarChart({ critical = 1, high = 4, medium = 7, low = 12 }: {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}) {
  const total = critical + high + medium + low || 1;
  const items = [
    { label: 'Critical', count: critical, color: 'bg-rose-500', barColor: '#f43f5e' },
    { label: 'High', count: high, color: 'bg-amber-500', barColor: '#f59e0b' },
    { label: 'Medium', count: medium, color: 'bg-indigo-500', barColor: '#6366f1' },
    { label: 'Low', count: low, color: 'bg-slate-400', barColor: '#94a3b8' },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Multi-Bar */}
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all duration-500`}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>

      {/* Legend & Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {items.map((item) => (
          <div key={item.label} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
