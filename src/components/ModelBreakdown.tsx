import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ComputedCosts } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  computedCosts: ComputedCosts;
}

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const d = entry.payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm shadow-xl">
      <p className="mb-1 font-semibold" style={{ color: d.color }}>
        {d.name}
      </p>
      <p className="text-slate-400">
        Cost: <span className="text-white">{formatCost(d.cost)}</span>
      </p>
      <p className="text-slate-400">
        Total tokens:{' '}
        <span className="text-white">{formatTokens(d.totalTokens)}</span>
      </p>
    </div>
  );
};

export function ModelBreakdown({ computedCosts }: Props) {
  const pieData = Object.entries(computedCosts.byModel)
    .filter(([, v]) => v.cost > 0)
    .map(([model, v]) => {
      const total =
        (v.tokens.inputTokens || 0) +
        (v.tokens.outputTokens || 0) +
        (v.tokens.cacheReadInputTokens || 0) +
        (v.tokens.cacheCreationInputTokens || 0);
      return {
        name: v.displayName || model,
        cost: v.cost,
        totalTokens: total,
        color: v.color || '#6366f1',
      };
    })
    .sort((a, b) => b.cost - a.cost);

  if (pieData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        No model data yet
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Model Breakdown</h3>
        <p className="text-xs text-slate-500">API cost share by model</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="cost"
            labelLine={false}
            label={renderCustomLabel}
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 space-y-2">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-xs text-slate-300">{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {formatTokens(d.totalTokens)}
              </span>
              <span className="text-xs font-medium text-white">
                {formatCost(d.cost)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
