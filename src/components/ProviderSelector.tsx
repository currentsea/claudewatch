import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Flame, Sparkles, Star, Atom } from 'lucide-react';

export type Provider = 'claude' | 'chatgpt' | 'gemini' | 'xai';

export const PROVIDERS: Array<{
  id: Provider;
  label: string;
  vendor: string;
  status: 'live' | 'coming-soon';
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}> = [
  {
    id: 'claude',
    label: 'Claude',
    vendor: 'Anthropic',
    status: 'live',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: Flame,
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    vendor: 'OpenAI',
    status: 'coming-soon',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: Sparkles,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    vendor: 'Google',
    status: 'coming-soon',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: Star,
  },
  {
    id: 'xai',
    label: 'Grok',
    vendor: 'xAI',
    status: 'coming-soon',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: Atom,
  },
];

interface Props {
  value: Provider;
  onChange: (p: Provider) => void;
}

export function ProviderSelector({ value, onChange }: Props) {
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

  const current = PROVIDERS.find((p) => p.id === value) ?? PROVIDERS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="provider-selector"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="provider-menu"
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${current.bg} ${current.border} ${current.color} hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
      >
        <CurrentIcon size={12} />
        {current.label}
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && (
        <div
          id="provider-menu"
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl sm:w-60"
        >
          <div className="border-b border-slate-700/60 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500">
            Choose provider
          </div>
          <ul className="divide-y divide-slate-700/40">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              const isActive = p.id === value;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                    data-testid={`provider-option-${p.id}`}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-800/60 focus-visible:outline-none focus-visible:bg-slate-800/60 ${
                      isActive ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <Icon size={14} className={p.color} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">
                        {p.label}
                        {isActive && (
                          <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                            (selected)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">{p.vendor}</p>
                    </div>
                    {p.status === 'coming-soon' && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        coming soon
                      </span>
                    )}
                    {p.status === 'live' && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        live
                      </span>
                    )}
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
