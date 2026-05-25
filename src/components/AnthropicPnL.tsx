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
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { SubscriptionTier } from '../types';
import {
  anthropicPnL,
  getCustomerRating,
  formatCost,
  formatMonthLabel,
} from '../utils/pricing';
import { MonthlyRollup } from '../types';

interface Props {
  subscriptionCost: SubscriptionTier;
  totalApiCost: number;
  currentPeriodCost: number;
  firstSessionDate: string | null;
  monthlyRollup: MonthlyRollup[];
}

const CustomTooltip = ({ active, payload, label, subCost }: any) => {
  if (!active || !payload?.length) return null;
  const apiCost = payload[0]?.value ?? 0;
  const profit = subCost - apiCost;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      <p className="text-slate-400">
        Your API usage cost:{' '}
        <span className="text-white">{formatCost(apiCost)}</span>
      </p>
      <p className="text-slate-400">
        Sub revenue:{' '}
        <span className="text-white">{formatCost(subCost)}</span>
      </p>
      <p
        className={`mt-1 font-semibold ${
          profit >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        Anthropic {profit >= 0 ? 'gains' : 'loses'}{' '}
        {formatCost(Math.abs(profit))}
      </p>
    </div>
  );
};

export function AnthropicPnL({
  subscriptionCost,
  totalApiCost,
  currentPeriodCost,
  firstSessionDate,
  monthlyRollup,
}: Props) {
  const { revenue, cost, profit, months } = anthropicPnL(
    subscriptionCost,
    totalApiCost,
    firstSessionDate
  );

  // profit margin from Anthropic's side: (revenue - cost) / revenue
  const profitMargin = revenue > 0 ? profit / revenue : 0;
  const rating = getCustomerRating(profitMargin);

  // Current period
  const periodProfit = subscriptionCost - currentPeriodCost;

  // Chart: per-month API cost vs flat subscription
  const chartData = monthlyRollup.map((m) => ({
    label: formatMonthLabel(m.month),
    apiCost: parseFloat(m.apiCost.toFixed(2)),
    profit: parseFloat((subscriptionCost - m.apiCost).toFixed(2)),
  }));

  const isLosingThisPeriod = periodProfit < 0;
  const isLosingAllTime = profit < 0;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Anthropic's P&amp;L on You
          </h3>
          <p className="text-xs text-slate-500">
            Sub revenue vs estimated compute cost over {months} month
            {months !== 1 ? 's' : ''}
          </p>
        </div>
        {isLosingAllTime ? (
          <TrendingDown size={18} className="text-red-400 mt-0.5" />
        ) : (
          <TrendingUp size={18} className="text-emerald-400 mt-0.5" />
        )}
      </div>

      {/* ── Customer rating badge ───────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-4 ${rating.bgColor} ${rating.borderColor}`}
      >
        <span className="text-3xl leading-none">{rating.emoji}</span>
        <div>
          <p className={`font-bold text-base ${rating.color}`}>
            {rating.label}
          </p>
          <p className="text-xs text-slate-400">{rating.sublabel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">Profit margin</p>
          <p className={`text-lg font-bold ${rating.color}`}>
            {(profitMargin * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* ── Two big numbers ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* All-time */}
        <div className="rounded-xl bg-slate-700/40 p-4">
          <p className="mb-1 text-xs text-slate-500">All-time net</p>
          <p
            className={`text-xl font-bold ${
              isLosingAllTime ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isLosingAllTime ? '−' : '+'}
            {formatCost(Math.abs(profit))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatCost(revenue)} revenue
            <br />
            {formatCost(cost)} in compute
          </p>
        </div>

        {/* This period */}
        <div className="rounded-xl bg-slate-700/40 p-4">
          <p className="mb-1 text-xs text-slate-500">This period net</p>
          <p
            className={`text-xl font-bold ${
              isLosingThisPeriod ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isLosingThisPeriod ? '−' : '+'}
            {formatCost(Math.abs(periodProfit))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatCost(subscriptionCost)} revenue
            <br />
            {formatCost(currentPeriodCost)} in compute
          </p>
        </div>
      </div>

      {/* ── Per-month profit/loss bar chart ────────────────────────────────── */}
      {chartData.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium text-slate-400">
            Anthropic's monthly gain / loss from you
          </p>
          <ResponsiveContainer width="100%" height={180}>
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
                content={<CustomTooltip subCost={subscriptionCost} />}
              />
              <ReferenceLine
                y={0}
                stroke="#64748b"
                strokeWidth={1}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs text-slate-600">
            Green = Anthropic profits · Red = Anthropic subsidises you
          </p>
        </div>
      )}

      {/* ── Breakdown row ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={12} className="text-slate-500" />
          <p className="text-xs font-medium text-slate-400">How this is calculated</p>
        </div>
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Subscription revenue ({months} × {formatCost(subscriptionCost)})</span>
            <span className="text-emerald-400 font-medium">{formatCost(revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated compute cost (API-rate equivalent)</span>
            <span className="text-red-400 font-medium">− {formatCost(cost)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-700/60 pt-1 mt-1">
            <span className="font-medium text-slate-300">Net to Anthropic</span>
            <span
              className={`font-bold ${
                profit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {profit >= 0 ? '+' : '−'}
              {formatCost(Math.abs(profit))}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        * Compute cost is approximated using public Anthropic API rates. Actual
        infrastructure margins vary; this is illustrative, not Anthropic's real P&amp;L.
      </p>
    </div>
  );
}
