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
import { DailyActivity } from '../types';
import { formatCost } from '../utils/pricing';

interface Props {
  dailyActivity: DailyActivity[];
  subscriptionCost: number;
}

interface DayDatum {
  label: string;
  apiCost: number;
  inBillingPeriod: boolean;
  sessionCount: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  dailyRate,
}: any) => {
  if (!active || !payload?.length) return null;
  const d: DayDatum = payload[0]?.payload;
  const pnl = dailyRate - d.apiCost;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm shadow-xl min-w-[200px]">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">API cost (compute)</span>
          <span className="text-white font-medium">{formatCost(d.apiCost)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Sub allocation / day</span>
          <span className="text-amber-400 font-medium">{formatCost(dailyRate)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-700/60 pt-1 mt-1">
          <span className="text-slate-300 font-medium">Anthropic net</span>
          <span className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : '−'}{formatCost(Math.abs(pnl))}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Sessions</span>
          <span className="text-slate-400">{d.sessionCount}</span>
        </div>
        {!d.inBillingPeriod && (
          <p className="text-slate-600 italic">Outside current billing period</p>
        )}
      </div>
    </div>
  );
};

export function DailyPnL({ dailyActivity, subscriptionCost }: Props) {
  const dailyRate = subscriptionCost / 30;

  // Only show days that had activity
  const activeDays = dailyActivity.filter((d) => d.estimatedCost > 0);
  const displayData: DayDatum[] = activeDays.slice(-60).map((d) => ({
    label: new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    apiCost: parseFloat(d.estimatedCost.toFixed(6)),
    inBillingPeriod: d.inBillingPeriod,
    sessionCount: d.sessionCount,
  }));

  if (displayData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm flex items-center justify-center h-48">
        <p className="text-sm text-slate-500">No daily activity to display</p>
      </div>
    );
  }

  // Summary stats
  const periodDays = displayData.filter((d) => d.inBillingPeriod);
  const allDays = displayData;
  const profitDays = allDays.filter((d) => d.apiCost <= dailyRate).length;
  const subsidisedDays = allDays.length - profitDays;

  const periodApiCost = periodDays.reduce((s, d) => s + d.apiCost, 0);
  const periodSubRevenue = periodDays.length * dailyRate;
  const periodNet = periodSubRevenue - periodApiCost;

  const maxCost = Math.max(...displayData.map((d) => d.apiCost), dailyRate * 1.1);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Daily Session P&amp;L</h3>
          <p className="text-xs text-slate-500">
            Daily API cost vs subscription allocation (
            <span className="text-amber-400 font-medium">{formatCost(dailyRate)}</span>
            /day · <span className="text-slate-400">{formatCost(subscriptionCost)}/mo ÷ 30</span>)
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${periodNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {periodNet >= 0 ? '+' : '−'}{formatCost(Math.abs(periodNet))}
          </p>
          <p className="text-xs text-slate-500">Anthropic net · this period</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {profitDays} profitable days
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          {subsidisedDays} days Anthropic subsidised
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 border border-slate-600/30 px-2.5 py-1 text-xs text-slate-400">
          {periodDays.length} billing-period days tracked
        </span>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={displayData}
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(displayData.length / 7) - 1)}
          />
          <YAxis
            tickFormatter={(v) => `$${v < 0.01 ? v.toFixed(3) : v.toFixed(2)}`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxCost * 1.1]}
            width={52}
          />
          <Tooltip content={<CustomTooltip dailyRate={dailyRate} />} />
          {/* Subscription daily allocation line */}
          <ReferenceLine
            y={dailyRate}
            stroke="#f59e0b"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: `${formatCost(dailyRate)}/day`,
              fill: '#f59e0b',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          <Bar dataKey="apiCost" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {displayData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.apiCost <= dailyRate ? '#10b981' : '#f43f5e'}
                fillOpacity={entry.inBillingPeriod ? 0.9 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-center text-xs text-slate-600">
        🟢 Green = Anthropic profitable · 🔴 Red = Anthropic subsidises ·
        Faded = outside billing period
      </p>

      {/* Period breakdown row */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
        <p className="mb-2 text-xs font-medium text-slate-400">
          Current billing period breakdown
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-500">Sub revenue</p>
            <p className="text-sm font-semibold text-emerald-400">
              {formatCost(periodSubRevenue)}
            </p>
            <p className="text-xs text-slate-600">
              {periodDays.length}d × {formatCost(dailyRate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">API compute cost</p>
            <p className="text-sm font-semibold text-red-400">
              {formatCost(periodApiCost)}
            </p>
            <p className="text-xs text-slate-600">
              {periodDays.length} active day{periodDays.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Anthropic net</p>
            <p
              className={`text-sm font-bold ${
                periodNet >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {periodNet >= 0 ? '+' : '−'}
              {formatCost(Math.abs(periodNet))}
            </p>
            <p className="text-xs text-slate-600">
              {periodNet >= 0 ? 'profit' : 'loss'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
