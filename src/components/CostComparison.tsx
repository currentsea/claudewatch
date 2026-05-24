import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { MonthlyRollup, SubscriptionTier } from '../types';
import { formatMonthLabel } from '../utils/pricing';

interface Props {
  monthlyRollup: MonthlyRollup[];
  subscriptionCost: SubscriptionTier;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  subscriptionCost,
}: any) => {
  if (!active || !payload?.length) return null;
  const cost = payload[0]?.value || 0;
  const saved = subscriptionCost - cost;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      <p className="text-slate-400">
        API Equivalent:{' '}
        <span className="text-red-400">${cost.toFixed(2)}</span>
      </p>
      <p className="text-slate-400">
        Subscription:{' '}
        <span className="text-blue-400">${subscriptionCost}/mo</span>
      </p>
      <p className={`font-medium ${saved >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {saved >= 0 ? `You saved $${saved.toFixed(2)}` : `API cheaper by $${Math.abs(saved).toFixed(2)}`}
      </p>
    </div>
  );
};

export function CostComparison({ monthlyRollup, subscriptionCost }: Props) {
  const chartData = monthlyRollup.map((m) => ({
    ...m,
    label: formatMonthLabel(m.month),
    apiCost: parseFloat(m.apiCost.toFixed(2)),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        No monthly data yet
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Monthly Cost — API vs Subscription
          </h3>
          <p className="text-xs text-slate-500">
            What you'd pay on pay-per-use vs your flat rate
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-500" />
            API cost
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-px w-4 border-t-2 border-dashed border-blue-400" />
            Sub price
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            content={<CustomTooltip subscriptionCost={subscriptionCost} />}
          />
          <ReferenceLine
            y={subscriptionCost}
            stroke="#60a5fa"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `$${subscriptionCost}`,
              fill: '#60a5fa',
              fontSize: 11,
              position: 'insideTopRight',
            }}
          />
          <Bar dataKey="apiCost" radius={[4, 4, 0, 0]} maxBarSize={50}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.apiCost > subscriptionCost ? '#f43f5e' : '#7c3aed'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
