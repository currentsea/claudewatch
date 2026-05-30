import React from 'react';
import {
  Clock,
  CheckCircle,
  ExternalLink,
  GitBranch,
  ChevronRight,
} from 'lucide-react';
import { Provider, PROVIDERS } from './ProviderSelector';

const PLANS: Record<
  Exclude<Provider, 'claude'>,
  {
    title: string;
    vendor: string;
    tagline: string;
    dataSource: string;
    plansCovered: string[];
    metrics: string[];
    pricingDocs: string;
    docsLabel: string;
    accent: string;
    accentBg: string;
    accentBorder: string;
  }
> = {
  chatgpt: {
    title: 'ChatGPT',
    vendor: 'OpenAI',
    tagline: 'Track Plus, Team, and Pro subscriptions against API equivalents.',
    dataSource: 'OpenAI exports (JSON / chat history) + manual usage paste',
    plansCovered: ['Plus ($20/mo)', 'Team ($25–30/seat/mo)', 'Pro ($200/mo)'],
    metrics: [
      'GPT-4o / o3 / o1 token consumption',
      'Cached vs uncached input split',
      'Tool calls (browsing, code, image)',
      'Daily/monthly P&L vs subscription',
    ],
    pricingDocs: 'https://openai.com/api/pricing/',
    docsLabel: 'openai.com/api/pricing',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/30',
  },
  gemini: {
    title: 'Gemini',
    vendor: 'Google',
    tagline:
      'Compare Gemini Advanced + AI Studio usage to Vertex AI API rates.',
    dataSource:
      'Google Takeout (Gemini history) + Vertex AI / AI Studio logs',
    plansCovered: ['Gemini Advanced ($19.99/mo)', 'AI Studio (free → paid)', 'Vertex pay-as-you-go'],
    metrics: [
      'Gemini 2.5 Pro / Flash / Nano usage',
      'Multimodal token weighting',
      'Long-context (1M / 2M) calls',
      'Workspace integrations',
    ],
    pricingDocs: 'https://ai.google.dev/gemini-api/docs/pricing',
    docsLabel: 'ai.google.dev/gemini-api/docs/pricing',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/30',
  },
  xai: {
    title: 'Grok',
    vendor: 'xAI',
    tagline:
      'Compare X Premium+ / SuperGrok subscriptions to Grok API token spend.',
    dataSource: 'Grok export + xAI API console',
    plansCovered: ['X Premium+ ($16/mo)', 'SuperGrok ($30/mo)', 'API pay-as-you-go'],
    metrics: [
      'Grok 3 / Grok 4 token usage',
      'Image generation calls',
      'Real-time X data lookups',
      'DeepSearch tool use',
    ],
    pricingDocs: 'https://docs.x.ai/docs/models',
    docsLabel: 'docs.x.ai/docs/models',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/10',
    accentBorder: 'border-violet-500/30',
  },
};

interface Props {
  provider: Exclude<Provider, 'claude'>;
  onSwitchToClaude: () => void;
}

export function ComingSoonProvider({ provider, onSwitchToClaude }: Props) {
  const meta = PROVIDERS.find((p) => p.id === provider)!;
  const plan = PLANS[provider];
  const Icon = meta.icon;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="mb-5 flex justify-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-3xl border-2 ${plan.accentBorder} ${plan.accentBg} shadow-lg`}
          >
            <Icon size={36} className={plan.accent} />
          </div>
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          <Clock size={11} />
          Coming soon
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          {plan.title} support is on the roadmap
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          ClaudeWatch will track {plan.vendor}'s {plan.title} usage the same way it
          tracks Claude: read local session data, price every token at published
          API rates, and compare to your subscription fee.
        </p>
        <p className="mt-1 text-sm italic text-slate-500">{plan.tagline}</p>
      </div>

      {/* What we'll show */}
      <div className="mb-6 rounded-2xl border border-slate-700/60 bg-black/10 p-6 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
          What we'll show you
        </h2>
        <ul className="space-y-2">
          {plan.metrics.map((m) => (
            <li key={m} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle size={14} className={plan.accent} />
              {m}
            </li>
          ))}
        </ul>
      </div>

      {/* Plans + data source */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Plans we'll cover
          </h3>
          <ul className="space-y-1.5">
            {plan.plansCovered.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-200">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.bg}`} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Data source
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {plan.dataSource}
          </p>
          <a
            href={plan.pricingDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline"
          >
            <ExternalLink size={11} /> Pricing reference · {plan.docsLabel}
          </a>
        </div>
      </div>

      {/* Status / CTA */}
      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-sm text-amber-100/80 leading-relaxed">
          <strong className="text-amber-300">Want to help ship this?</strong>{' '}
          ClaudeWatch is open source. Drop a PR adding{' '}
          {plan.title} parsing, or open an issue describing the export format
          {plan.vendor} gives you.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://github.com/currentsea/claudewatch/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/30 transition-all"
          >
            <GitBranch size={12} /> Open an issue
          </a>
          <a
            href="https://github.com/currentsea/claudewatch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-all"
          >
            <ExternalLink size={12} /> View source
          </a>
        </div>
      </div>

      {/* Fallback link */}
      <div className="flex items-center justify-center">
        <button
          onClick={onSwitchToClaude}
          className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20 transition-all"
        >
          Back to Claude dashboard <ChevronRight size={14} />
        </button>
      </div>
    </main>
  );
}
