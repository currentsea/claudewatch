import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { TimeRange, TimeRangePreset, buildTimeRange } from '../utils/pricing';

interface Props {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

interface Option {
  preset: TimeRangePreset;
  label: string;
  hint: string;
}

const OPTIONS: Option[] = [
  { preset: 'thisMonth', label: 'This month', hint: 'Current calendar month' },
  { preset: 'last7', label: 'Last 7 days', hint: 'Rolling week' },
  { preset: 'last30', label: 'Last 30 days', hint: 'Rolling month' },
  { preset: 'last90', label: 'Last 90 days', hint: 'Rolling quarter' },
  { preset: 'allTime', label: 'All time', hint: 'Every recorded session' },
];

export function TimeRangeSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', click);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', click);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="time-range-selector"
        className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-700/60"
      >
        <Calendar size={12} className="text-emerald-400" />
        <span>{value.label}</span>
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-700/60 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500">
            Time range
          </div>
          <ul className="divide-y divide-slate-700/40">
            {OPTIONS.map((opt) => {
              const isActive = value.preset === opt.preset;
              return (
                <li key={opt.preset}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(buildTimeRange(opt.preset));
                      setOpen(false);
                    }}
                    data-testid={`time-range-${opt.preset}`}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800/60 ${
                      isActive ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-white">{opt.label}</span>
                      <span className="block text-[11px] text-slate-500">{opt.hint}</span>
                    </span>
                    {isActive && <Check size={13} className="text-emerald-400 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
