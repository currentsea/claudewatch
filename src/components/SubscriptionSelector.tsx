import React from 'react';
import { SubscriptionTier } from '../types';
import { SUBSCRIPTION_TIERS } from '../utils/pricing';

interface Props {
  value: SubscriptionTier;
  onChange: (tier: SubscriptionTier) => void;
}

export function SubscriptionSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-800/50 p-1">
      {SUBSCRIPTION_TIERS.map((tier) => {
        const isActive = value === tier.value;
        return (
          <button
            key={tier.value}
            onClick={() => onChange(tier.value)}
            className={`flex flex-col items-center rounded-lg px-3 py-2 transition-all duration-200 min-w-[72px] ${
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
