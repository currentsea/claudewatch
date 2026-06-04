import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { DailyActivity, SubscriptionTier } from '../types';
import { formatCost } from '../utils/pricing';

interface Props {
  dailyActivity: DailyActivity[];
  subscriptionCost: SubscriptionTier;
  subscriptionLabel?: string;
}

type RangeMode = 'period' | 'last30' | 'all';
type ViewMode = 'daily' | 'cumulative';

const WIN = '#10b981'; // emerald — net winner
const LOSE = '#ef4444'; // red — net loser

interface Row {
  date: string;
  label: string;
  cost: number;
  allowance: number;
  net: number;
  cumulative: number;
  isWinner: boolean;
}

/**
 * Burn Rate — daily net winner/loser view.
 *
 * Each day you are "allotted" subscriptionCost / 30 of API-equivalent spend
 * (e.g. $200 / 30 ≈ $6.67/day). If the API-equivalent value you actually
 * consumed that day exceeds the allowance you came out ahead (net winner);
 * if it fell short, Anthropic kept the difference (net loser). The chart
 * makes the per-day gain/loss — and the running total — visible at a glance.
 */
export function BurnRateChart({
  dailyActivity,
  subscriptionCost,
  subscriptionLabel,
}: Props) {
  const [range, setRange] = useState<RangeMode>('last30');
  const [view, setView] = useState<ViewMode>('daily');

  const allowance = subscriptionCost / 30;

  const rows = useMemo<Row[]>(() => {
    let days = [...dailyActivity].sort((a, b) => a.date.localeCompare(b.date));
    if (range === 'period') {
      days = days.filter((d) => d.inBillingPeriod);
    } else if (range === 'last30') {
      days = days.slice(-30);
    }
    let cum = 0;
    return days.map((d) => {
      const cost = d.estimatedCost || 0;
      const net = cost - allowance;
      cum += net;
      return {
        date: d.date,
        label: new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
        }),
        cost,
        allowance,
        net,
        cumulative: cum,
        isWinner: net >= 0,
      };
    });
  }, [dailyActivity, allowance, range]);

  // ── Period summary ──────────────────────────────────────────────────────────
  const totalUsed = rows.reduce((s, r) => s + r.cost, 0);
  const totalAllowance = allowance * rows.length;
  const netTotal = totalUsed - totalAllowance;
  const isNetWinner = netTotal >= 0;
  const winningDays = rows.filter((r) => r.isWinner).length;
  const losingDays = rows.length - winningDays;
  const verdictColor = isNetWinner ? WIN : LOSE;

  const rangeLabel =
    range === 'period'
      ? 'this billing period'
      : range === 'last30'
        ? 'the last 30 days'
        : 'all recorded days';

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/40 to-black/20 p-5 backdrop-blur-sm sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Flame size={12} className="text-amber-400" />
            Burn Rate
          </div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Are you a net winner or loser?
          </h2>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500">
            Your subscription gives you{' '}
            <span className="font-medium text-slate-300">
              {formatCost(allowance)}/day
            </span>{' '}
            of API-equivalent value ({subscriptionLabel ?? formatCost(subscriptionCost)} ÷ 30
            days). Each bar shows whether that day's actual API usage beat the daily
            allowance — and by how much.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Range toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 p-0.5">
            {(
              [
                ['period', 'This period'],
                ['last30', 'Last 30d'],
                ['all', 'All time'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRange(val)}
                data-testid={`burn-range-${val}`}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  range === val
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 p-0.5">
            {(
              [
                ['daily', 'Daily net'],
                ['cumulative', 'Cumulative'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setView(val)}
                data-testid={`burn-view-${val}`}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  view === val
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verdict + stat strip */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{
            borderColor: `${verdictColor}40`,
            background: `${verdictColor}0d`,
          }}
          data-testid="burn-verdict"
        >
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
            {isNetWinner ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            Net result
          </p>
          <p
            className="mt-0.5 text-lg font-bold"
            style={{ color: verdictColor }}
          >
            {isNetWinner ? 'Winner' : 'Loser'}
          </p>
          <p className="text-[10px] text-slate-500">
            {isNetWinner ? '+' : '−'}
            {formatCost(Math.abs(netTotal))} over {rows.length} day
            {rows.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-black/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            API value used
          </p>
          <p className="mt-0.5 text-lg font-bold text-white">{formatCost(totalUsed)}</p>
          <p className="text-[10px] text-slate-500">
            vs {formatCost(totalAllowance)} allotted
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">
            Winning days
          </p>
          <p className="mt-0.5 text-lg font-bold text-emerald-300">{winningDays}</p>
          <p className="text-[10px] text-slate-500">beat the daily allowance</p>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-red-300/70">
            Losing days
          </p>
          <p className="mt-0.5 text-lg font-bold text-red-300">{losingDays}</p>
          <p className="text-[10px] text-slate-500">fell short of allowance</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No daily activity recorded for {rangeLabel}.
          </div>
        ) : view === 'daily' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                content={<DailyTooltip />}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
              <Bar dataKey="net" name="Net vs allowance" radius={[3, 3, 0, 0]}>
                {rows.map((r) => (
                  <Cell key={r.date} fill={r.isWinner ? WIN : LOSE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
              <defs>
                <linearGradient id="burnCumFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={verdictColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={verdictColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                cursor={{ stroke: '#475569' }}
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                content={<CumulativeTooltip />}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative net"
                stroke={verdictColor}
                strokeWidth={2}
                fill="url(#burnCumFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-600">
        {view === 'daily'
          ? 'Bars above the line are days you extracted more API value than your daily allowance (you win); bars below are days the subscription cost more than you used.'
          : 'The running total of daily wins minus losses. Above zero, your subscription is paying off; below zero, you have not yet used your allotted value.'}
      </p>
    </div>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
function DailyTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const r: Row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs">
      <p className="mb-1 font-semibold text-slate-100">
        {new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </p>
      <p className="text-slate-300">API value used: {formatCost(r.cost)}</p>
      <p className="text-slate-400">Daily allowance: {formatCost(r.allowance)}</p>
      <p
        className="mt-1 font-semibold"
        style={{ color: r.isWinner ? WIN : LOSE }}
      >
        {r.isWinner ? 'Net gain ' : 'Net loss '}
        {r.isWinner ? '+' : '−'}
        {formatCost(Math.abs(r.net))}
      </p>
    </div>
  );
}

function CumulativeTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const r: Row = payload[0].payload;
  const positive = r.cumulative >= 0;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs">
      <p className="mb-1 font-semibold text-slate-100">
        {new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </p>
      <p className="text-slate-400">Day's net: {r.net >= 0 ? '+' : '−'}{formatCost(Math.abs(r.net))}</p>
      <p
        className="mt-1 font-semibold"
        style={{ color: positive ? WIN : LOSE }}
      >
        Running total: {positive ? '+' : '−'}
        {formatCost(Math.abs(r.cumulative))}
      </p>
    </div>
  );
}
