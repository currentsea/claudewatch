import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Activity, Hourglass, Clock, Flame } from 'lucide-react';
import { ActiveSession, Session, DailyActivity } from '../types';

interface Props {
  sessions: Session[];
  activeSessions: ActiveSession[];
  dailyActivity: DailyActivity[];
  windowHours?: number;
}

/** Bucket label for a session's age. */
function ageBucket(minutesAgo: number, windowMinutes: number): string {
  if (minutesAgo <= windowMinutes) return 'Active now';
  if (minutesAgo <= 60 * 24) return 'Today';
  if (minutesAgo <= 60 * 24 * 7) return 'This week';
  if (minutesAgo <= 60 * 24 * 30) return 'This month';
  return 'Older';
}

const BUCKET_ORDER = ['Active now', 'Today', 'This week', 'This month', 'Older'] as const;
const BUCKET_COLORS: Record<string, string> = {
  'Active now': '#10b981',
  Today: '#22d3ee',
  'This week': '#6366f1',
  'This month': '#a855f7',
  Older: '#64748b',
};

/**
 * Two-pane chart:
 *
 *   1. Active vs Inactive split — how many sessions are in the rolling usage
 *      window right now vs older.
 *   2. Sessions by usage window — sessions grouped by when their last
 *      activity puts them on the timeline (active now / today / week / etc).
 */
export function SessionActivityChart({
  sessions,
  activeSessions,
  dailyActivity,
  windowHours = 5,
}: Props) {
  const [mode, setMode] = useState<'buckets' | 'timeline'>('buckets');

  // ── Bucket breakdown ───────────────────────────────────────────────────────
  const buckets = useMemo(() => {
    const windowMinutes = windowHours * 60;
    const counts: Record<string, number> = {
      'Active now': 0, Today: 0, 'This week': 0, 'This month': 0, Older: 0,
    };
    const now = Date.now();
    for (const s of sessions) {
      if (!s.lastActivity) {
        counts.Older++;
        continue;
      }
      const ageMs = now - new Date(s.lastActivity).getTime();
      const ageMin = ageMs / 60000;
      const bucket = ageBucket(ageMin, windowMinutes);
      counts[bucket]++;
    }
    return BUCKET_ORDER.map((b) => ({ bucket: b, sessions: counts[b], fill: BUCKET_COLORS[b] }));
  }, [sessions, windowHours]);

  const activeCount = buckets[0].sessions;
  const inactiveCount = sessions.length - activeCount;
  const activePct = sessions.length === 0 ? 0 : (activeCount / sessions.length) * 100;

  // ── Daily timeline (last 14 days of sessionCount) ──────────────────────────
  const timeline = useMemo(() => {
    const last = [...dailyActivity]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
    const todayStr = new Date().toISOString().slice(0, 10);
    return last.map((d) => ({
      date: d.date,
      label: new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      }),
      sessions: d.sessionCount || 0,
      messages: d.messageCount || 0,
      isToday: d.date === todayStr,
    }));
  }, [dailyActivity]);

  // ── Active windows (5h rolling usage windows currently in flight) ──────────
  const activeWindows = activeSessions.length;
  const totalActiveCost = activeSessions.reduce((s, x) => s + (x.estimatedCost || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Activity size={11} className="text-emerald-400" />
            Session activity
          </div>
          <h3 className="text-base font-bold text-white">
            Active vs inactive sessions
          </h3>
          <p className="text-xs text-slate-500">
            Bucketed by recency, with the {windowHours}h rolling usage window highlighted.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 p-0.5">
          <button
            onClick={() => setMode('buckets')}
            data-testid="activity-mode-buckets"
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              mode === 'buckets'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By bucket
          </button>
          <button
            onClick={() => setMode('timeline')}
            data-testid="activity-mode-timeline"
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              mode === 'timeline'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By day
          </button>
        </div>
      </div>

      {/* Quick stat strip */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-emerald-300/70">
            <Flame size={10} /> Active
          </p>
          <p className="mt-0.5 text-lg font-bold text-emerald-300" data-testid="active-count">
            {activeCount}
          </p>
          <p className="text-[10px] text-slate-500">{activePct.toFixed(0)}% of {sessions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-black/20 px-3 py-2">
          <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
            <Clock size={10} /> Inactive
          </p>
          <p className="mt-0.5 text-lg font-bold text-slate-300" data-testid="inactive-count">
            {inactiveCount}
          </p>
          <p className="text-[10px] text-slate-500">outside {windowHours}h window</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-amber-300/70">
            <Hourglass size={10} /> Open windows
          </p>
          <p className="mt-0.5 text-lg font-bold text-amber-300">{activeWindows}</p>
          <p className="text-[10px] text-slate-500">
            ${totalActiveCost.toFixed(2)} in flight
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        {mode === 'buckets' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 4, right: 8, left: -22, bottom: 4 }}>
              <XAxis
                dataKey="bucket"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Bar dataKey="sessions" name="Sessions" radius={[6, 6, 0, 0]}>
                {buckets.map((b) => (
                  <Cell key={b.bucket} fill={b.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} margin={{ top: 4, right: 8, left: -22, bottom: 4 }}>
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
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                iconType="circle"
              />
              <Bar dataKey="sessions" name="Sessions" radius={[4, 4, 0, 0]}>
                {timeline.map((t) => (
                  <Cell
                    key={t.date}
                    fill={t.isToday ? '#10b981' : '#6366f1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend strip */}
      {mode === 'buckets' && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          {BUCKET_ORDER.map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: BUCKET_COLORS[b] }}
              />
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
