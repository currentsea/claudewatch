import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
    good?: boolean; // true = green, false = red
  };
  badge?: { label: string; color: string };
  /** When provided, renders a clickable drilldown affordance */
  onDrilldown?: () => void;
  drilldownLabel?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-slate-400',
  valueColor = 'text-white',
  trend,
  badge,
  onDrilldown,
  drilldownLabel = 'See breakdown',
}: StatCardProps) {
  const Wrapper = onDrilldown ? 'button' : 'div';

  return (
    <Wrapper
      className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:bg-black/20 text-left w-full ${
        onDrilldown ? 'cursor-pointer group' : ''
      }`}
      onClick={onDrilldown}
      aria-label={onDrilldown ? `${title} — ${drilldownLabel}` : undefined}
    >
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-700/10 to-transparent" />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className={`rounded-lg bg-slate-700/50 p-2 ${iconColor}`}>
            <Icon size={16} />
          </div>
        </div>

        <p className={`mb-1 text-2xl font-bold tracking-tight ${valueColor}`}>
          {value}
        </p>

        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}

        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={`text-xs font-medium ${
                trend.good === true
                  ? 'text-emerald-400'
                  : trend.good === false
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              {trend.direction === 'up'
                ? '↑'
                : trend.direction === 'down'
                ? '↓'
                : '→'}{' '}
              {trend.label}
            </span>
          </div>
        )}

        {badge && (
          <div className="mt-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>
        )}

        {onDrilldown && (
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
            <ChevronRight size={12} />
            {drilldownLabel}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
