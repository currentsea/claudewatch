import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TotalStats } from '../types';
import { formatTokens } from '../utils/pricing';

interface Props {
  totalStats: TotalStats;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="text-xs">
          {p.name}: {formatTokens(p.value)}
        </p>
      ))}
    </div>
  );
};

export function TokenBreakdown({ totalStats }: Props) {
  const data = [
    {
      name: 'All-Time',
      'Cache Read': totalStats.totalCacheRead,
      'Cache Write': totalStats.totalCacheCreate,
      'Input': totalStats.totalInputTokens,
      'Output': totalStats.totalOutputTokens,
    },
  ];

  const bars = [
    { key: 'Cache Read', color: '#06b6d4' },
    { key: 'Cache Write', color: '#8b5cf6' },
    { key: 'Input', color: '#6366f1' },
    { key: 'Output', color: '#10b981' },
  ];

  const total = totalStats.grandTotal;
  const cacheTotal = totalStats.totalCacheRead + totalStats.totalCacheCreate;
  const cachePct = total > 0 ? ((cacheTotal / total) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Token Breakdown</h3>
          <p className="text-xs text-slate-500">
            {cachePct}% of tokens served from cache
          </p>
        </div>
        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400 border border-cyan-500/20">
          {formatTokens(total)} total
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#334155"
            strokeOpacity={0.4}
          />
          <XAxis
            type="number"
            tickFormatter={formatTokens}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
          />
          {bars.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              stackId="a"
              fill={b.color}
              fillOpacity={0.85}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary pills */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Input', val: totalStats.totalInputTokens, color: 'text-indigo-400' },
          { label: 'Output', val: totalStats.totalOutputTokens, color: 'text-emerald-400' },
          { label: 'Cache Read', val: totalStats.totalCacheRead, color: 'text-cyan-400' },
          { label: 'Cache Write', val: totalStats.totalCacheCreate, color: 'text-violet-400' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-slate-700/40 px-3 py-2 text-center"
          >
            <p className={`text-sm font-bold ${item.color}`}>
              {formatTokens(item.val)}
            </p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
