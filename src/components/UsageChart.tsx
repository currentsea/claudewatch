import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { DailyActivity } from '../types';
import { formatTokens } from '../utils/pricing';

interface Props {
  data: DailyActivity[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DailyActivity;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      <div className="space-y-1 text-slate-400">
        <p>
          <span className="text-violet-400">Tokens:</span>{' '}
          {formatTokens(d.totalTokens)}
        </p>
        <p>
          <span className="text-emerald-400">API Cost:</span> $
          {d.estimatedCost.toFixed(4)}
        </p>
        <p>
          <span className="text-blue-400">Messages:</span> {d.messageCount}
        </p>
        <p>
          <span className="text-amber-400">Tool Calls:</span> {d.toolCallCount}
        </p>
      </div>
    </div>
  );
};

export function UsageChart({ data }: Props) {
  // Show last 60 days maximum
  const displayData = data.slice(-60).map((d) => ({
    ...d,
    dateLabel: new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const maxTokens = Math.max(...displayData.map((d) => d.totalTokens), 1);

  // Find the start of the billing period
  const billingStart = displayData.findIndex((d) => d.inBillingPeriod);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Daily Token Usage
          </h3>
          <p className="text-xs text-slate-500">
            Last {displayData.length} days
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-violet-500/60" />
            Tokens
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-px w-3 border-t border-dashed border-amber-400" />
            Billing period
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={displayData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(displayData.length / 6)}
          />
          <YAxis
            tickFormatter={(v) => formatTokens(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxTokens * 1.1]}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          {billingStart >= 0 && (
            <ReferenceLine
              x={displayData[billingStart]?.dateLabel}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: 'Period',
                fill: '#f59e0b',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="totalTokens"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#tokenGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
