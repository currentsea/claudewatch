import React from 'react';
import { Zap, ExternalLink, TrendingUp } from 'lucide-react';

/**
 * The "this can't keep growing forever" sidebar.
 *
 * The dashboard already shows that Anthropic is subsidising heavy users.
 * This component contextualises that one user's deficit against the
 * macro trend: training-compute spend roughly doubles every ~6 months,
 * frontier-model unit costs are still falling but training capex is not,
 * and the subsidy is what's funding the gap between list price and the
 * price most heavy users would actually pay.
 */
const LINKS = [
  {
    title: 'Epoch AI — Training compute is doubling every ~6 months',
    href: 'https://epoch.ai/blog/training-compute-of-frontier-ai-models-grows-by-4-5x-per-year',
    blurb:
      "Frontier training runs have grown ~4–5× per year for a decade. That curve is what funds the gap between API list price and your subscription.",
  },
  {
    title: 'SemiAnalysis — The $100B inference price war',
    href: 'https://semianalysis.com/',
    blurb:
      'Frontier labs are selling inference at or below cost to lock in distribution. Subscription tiers are the most aggressive segment.',
  },
  {
    title: 'Stanford AI Index — Frontier model training costs',
    href: 'https://aiindex.stanford.edu/report/',
    blurb:
      'Annual benchmark report tracking how training cost per state-of-the-art model has gone from $4M (2017) to $100M+ (2024+).',
  },
  {
    title: 'Goldman Sachs — Gen AI: too much spend, too little benefit?',
    href: 'https://www.goldmansachs.com/insights/articles/gen-ai-too-much-spend-too-little-benefit',
    blurb:
      "Industry will spend ~$1T on AI capex over coming years with unclear unit economics. The subsidy you see here is one node in that flow.",
  },
];

export function SustainabilityLinks() {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Why this is not sustainable
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            The subsidy in the chart above isn't a glitch — it's the business
            model. Frontier training compute roughly doubles every 6 months,
            but subscription prices barely move. Background reading:
          </p>
        </div>
        <TrendingUp size={18} className="shrink-0 text-amber-400" />
      </div>

      <ul className="space-y-2">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-xl border border-slate-700/40 bg-black/20 p-3 transition-colors hover:border-slate-600/60 hover:bg-black/30"
            >
              <div className="flex items-start gap-2">
                <ExternalLink
                  size={11}
                  className="mt-0.5 shrink-0 text-slate-500 group-hover:text-slate-300"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 group-hover:text-white">
                    {l.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {l.blurb}
                  </p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
        External links open in new tabs. BurnItDown does not endorse the
        publishers' broader views — these are starting points, not conclusions.
      </p>
    </div>
  );
}
