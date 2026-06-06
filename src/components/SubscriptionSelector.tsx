import React from 'react';
import { SubscriptionTier } from '../types';

interface Tier {
  value: SubscriptionTier;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

interface Props {
  value: SubscriptionTier;
  onChange: (tier: SubscriptionTier) => void;
  tiers: readonly Tier[];
}

export function SubscriptionSelector({ value, onChange, tiers }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-800/50 p-1">
      {tiers.map((tier) => {
        const isActive = value === tier.value;
        return (
          <button
            key={tier.label}
            onClick={() => onChange(tier.value)}
            className={`flex flex-col items-center rounded-lg px-3 py-2 transition-all duration-200 min-w-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-blue-500/50 ${
              isActive
                ? `${tier.bg} ${tier.border} border ${tier.color}`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent'
            }`}
          >
            <span className={`text-sm font-semibold ${isActive ? tier.color : ''}`}>
              {tier.label}
            </span>
            <span className="text-xs opacity-70">{tier.description}</span>
          </button>
        );
      })}
    </div>
  );
}
