import React, { useCallback } from 'react';
import {
  RotateCcw,
  ExternalLink,
  Info,
  DollarSign,
  Cpu,
  BookOpen,
} from 'lucide-react';
import { PricingSettings, ModelPricingValues } from '../types';
import { DEFAULT_PRICING_SETTINGS } from '../utils/pricing';

interface Props {
  settings: PricingSettings;
  onChange: (s: PricingSettings) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePositiveFloat(raw: string, fallback: number): number {
  const n = parseFloat(raw);
  return isFinite(n) && n >= 0 ? n : fallback;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon size={14} className="text-slate-500" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {children}
      </span>
      <div className="flex-1 border-t border-slate-700/60" />
    </div>
  );
}

interface FieldProps {
  label: string;
  value: number;
  step?: string;
  onChange: (v: number) => void;
}

function PriceField({ label, value, step = '0.01', onChange }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          $
        </span>
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(parsePositiveFloat(e.target.value, value))}
          className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 py-1.5 pl-6 pr-2 text-right text-sm text-white focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        />
      </div>
    </div>
  );
}

// ── Model pricing row ─────────────────────────────────────────────────────────

interface ModelRowProps {
  name: string;
  color: string;
  badge: string;
  badgeColor: string;
  values: ModelPricingValues;
  defaults: ModelPricingValues;
  onChange: (v: ModelPricingValues) => void;
}

function ModelPricingRow({
  name,
  color,
  badge,
  badgeColor,
  values,
  defaults,
  onChange,
}: ModelRowProps) {
  const isDefault =
    values.input === defaults.input &&
    values.output === defaults.output &&
    values.cacheCreation === defaults.cacheCreation &&
    values.cacheRead === defaults.cacheRead;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${color}`}>{name}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeColor}`}
          >
            {badge}
          </span>
        </div>
        {!isDefault && (
          <button
            onClick={() => onChange(defaults)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RotateCcw size={10} /> reset
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PriceField
          label="Input / 1M tokens"
          value={values.input}
          onChange={(v) => onChange({ ...values, input: v })}
        />
        <PriceField
          label="Output / 1M tokens"
          value={values.output}
          onChange={(v) => onChange({ ...values, output: v })}
        />
        <PriceField
          label="Cache write / 1M"
          value={values.cacheCreation}
          onChange={(v) => onChange({ ...values, cacheCreation: v })}
        />
        <PriceField
          label="Cache read / 1M"
          step="0.001"
          value={values.cacheRead}
          onChange={(v) => onChange({ ...values, cacheRead: v })}
        />
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PricingSettingsPanel({ settings, onChange }: Props) {
  const isDefault =
    JSON.stringify(settings) === JSON.stringify(DEFAULT_PRICING_SETTINGS);

  const setModelPricing = useCallback(
    (tier: 'opus' | 'sonnet' | 'haiku', values: ModelPricingValues) => {
      onChange({
        ...settings,
        modelPricing: { ...settings.modelPricing, [tier]: values },
      });
    },
    [settings, onChange]
  );

  const setSubTier = useCallback(
    (key: keyof PricingSettings['subscriptionTiers'], value: number) => {
      onChange({
        ...settings,
        subscriptionTiers: { ...settings.subscriptionTiers, [key]: value },
      });
    },
    [settings, onChange]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Pricing Settings</h2>
          <p className="mt-1 text-sm text-slate-400">
            Customise the API rates and subscription costs used to calculate
            dashboard values. Changes are saved automatically and applied
            immediately.
          </p>
        </div>
        {!isDefault && (
          <button
            onClick={() => onChange(DEFAULT_PRICING_SETTINGS)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:border-slate-600 hover:text-white transition-all"
          >
            <RotateCcw size={12} /> Reset all to defaults
          </button>
        )}
      </div>

      {/* ── Model pricing ────────────────────────────────────────────────────── */}
      <SectionHeading icon={Cpu}>
        Model API Rates &nbsp;(USD per 1 million tokens)
      </SectionHeading>

      <div className="mb-8 space-y-3">
        <ModelPricingRow
          name="Claude Opus"
          color="text-purple-400"
          badge="Most capable"
          badgeColor="border-purple-500/30 text-purple-400 bg-purple-500/10"
          values={settings.modelPricing.opus}
          defaults={DEFAULT_PRICING_SETTINGS.modelPricing.opus}
          onChange={(v) => setModelPricing('opus', v)}
        />
        <ModelPricingRow
          name="Claude Sonnet"
          color="text-indigo-400"
          badge="Balanced"
          badgeColor="border-indigo-500/30 text-indigo-400 bg-indigo-500/10"
          values={settings.modelPricing.sonnet}
          defaults={DEFAULT_PRICING_SETTINGS.modelPricing.sonnet}
          onChange={(v) => setModelPricing('sonnet', v)}
        />
        <ModelPricingRow
          name="Claude Haiku"
          color="text-cyan-400"
          badge="Fastest"
          badgeColor="border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
          values={settings.modelPricing.haiku}
          defaults={DEFAULT_PRICING_SETTINGS.modelPricing.haiku}
          onChange={(v) => setModelPricing('haiku', v)}
        />
      </div>

      {/* ── Subscription tiers ───────────────────────────────────────────────── */}
      <SectionHeading icon={DollarSign}>
        Subscription Plan Costs &nbsp;(USD / month)
      </SectionHeading>

      <div className="mb-8 rounded-xl border border-slate-700/60 bg-slate-800/50 p-4">
        <p className="mb-4 text-xs text-slate-500">
          Edit these if your plan cost differs from the defaults — e.g. annual
          billing, regional pricing, or team plans.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Pro */}
          <div className="space-y-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-blue-400">Pro</span>
            </div>
            <PriceField
              label="Monthly cost"
              step="1"
              value={settings.subscriptionTiers.pro}
              onChange={(v) => setSubTier('pro', Math.round(v))}
            />
            <p className="text-xs text-slate-600">Default: $20/mo</p>
          </div>
          {/* Max 5× */}
          <div className="space-y-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-sm font-semibold text-violet-400">
                Max 5×
              </span>
            </div>
            <PriceField
              label="Monthly cost"
              step="1"
              value={settings.subscriptionTiers.max5x}
              onChange={(v) => setSubTier('max5x', Math.round(v))}
            />
            <p className="text-xs text-slate-600">Default: $100/mo</p>
          </div>
          {/* Max 20× */}
          <div className="space-y-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
              <span className="text-sm font-semibold text-fuchsia-400">
                Max 20×
              </span>
            </div>
            <PriceField
              label="Monthly cost"
              step="1"
              value={settings.subscriptionTiers.max20x}
              onChange={(v) => setSubTier('max20x', Math.round(v))}
            />
            <p className="text-xs text-slate-600">Default: $200/mo</p>
          </div>
        </div>
      </div>

      {/* ── How costs are calculated ─────────────────────────────────────────── */}
      <SectionHeading icon={Info}>How costs are calculated</SectionHeading>

      <div className="mb-8 rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 text-sm text-slate-400 space-y-3">
        <p>
          BurnItDown reads every{' '}
          <code className="rounded bg-slate-700/60 px-1 text-slate-300">
            assistant
          </code>{' '}
          message in your{' '}
          <code className="rounded bg-slate-700/60 px-1 text-slate-300">
            ~/.claude/projects/**/*.jsonl
          </code>{' '}
          files. Each message contains a{' '}
          <code className="rounded bg-slate-700/60 px-1 text-slate-300">
            usage
          </code>{' '}
          block with four token counts:
        </p>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 font-mono text-xs text-slate-300 space-y-1">
          <p>
            <span className="text-yellow-400">input_tokens</span>
            <span className="text-slate-500"> × input rate / 1 000 000</span>
          </p>
          <p>
            <span className="text-green-400">output_tokens</span>
            <span className="text-slate-500"> × output rate / 1 000 000</span>
          </p>
          <p>
            <span className="text-blue-400">cache_creation_input_tokens</span>
            <span className="text-slate-500"> × cache write rate / 1 000 000</span>
          </p>
          <p>
            <span className="text-cyan-400">cache_read_input_tokens</span>
            <span className="text-slate-500"> × cache read rate / 1 000 000</span>
          </p>
        </div>
        <p>
          The model name (
          <code className="rounded bg-slate-700/60 px-1 text-slate-300">
            claude-opus-*
          </code>
          ,{' '}
          <code className="rounded bg-slate-700/60 px-1 text-slate-300">
            claude-sonnet-*
          </code>
          ,{' '}
          <code className="rounded bg-slate-700/60 px-1 text-slate-300">
            claude-haiku-*
          </code>
          ) is matched to the pricing tier above and the four token counts are
          multiplied by the corresponding rates and summed to produce the
          per-message API-equivalent cost.
        </p>
        <p className="text-xs text-slate-600">
          Note: these are <strong className="text-slate-400">estimates</strong>.
          Your Claude.ai subscription is flat-rate; the numbers show what the
          same usage would cost on pay-per-use API billing. Actual API pricing
          may differ for enterprise agreements or bulk discounts.
        </p>
      </div>

      {/* ── Sources ──────────────────────────────────────────────────────────── */}
      <SectionHeading icon={BookOpen}>Sources &amp; References</SectionHeading>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 space-y-4">
        <p className="text-xs text-slate-400">
          Default rates are taken directly from Anthropic's public pricing
          pages. Check these links to verify current prices or update the
          fields above if rates have changed.
        </p>

        <div className="space-y-3">
          {/* Source 1 */}
          <a
            href="https://www.anthropic.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm hover:border-slate-500/60 transition-colors group"
          >
            <ExternalLink
              size={14}
              className="mt-0.5 shrink-0 text-slate-500 group-hover:text-blue-400 transition-colors"
            />
            <div>
              <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                Anthropic Pricing — anthropic.com/pricing
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Official per-token API pricing for Claude models. Lists input,
                output, prompt-cache write, and prompt-cache read rates for
                Opus, Sonnet, and Haiku tiers.
              </p>
            </div>
          </a>

          {/* Source 2 */}
          <a
            href="https://docs.anthropic.com/en/docs/about-claude/models/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm hover:border-slate-500/60 transition-colors group"
          >
            <ExternalLink
              size={14}
              className="mt-0.5 shrink-0 text-slate-500 group-hover:text-blue-400 transition-colors"
            />
            <div>
              <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                Anthropic Docs — Model Overview
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Lists all current and legacy model IDs with their capabilities,
                context windows, and per-token rates. Used to map model name
                strings found in JSONL files to pricing tiers.
              </p>
            </div>
          </a>

          {/* Source 3 */}
          <a
            href="https://claude.ai/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm hover:border-slate-500/60 transition-colors group"
          >
            <ExternalLink
              size={14}
              className="mt-0.5 shrink-0 text-slate-500 group-hover:text-blue-400 transition-colors"
            />
            <div>
              <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                Claude.ai Plans — claude.ai/upgrade
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Source for the flat-rate subscription costs: Pro ($20/mo), Max
                5× ($100/mo), Max 20× ($200/mo). These are compared against the
                API-equivalent usage cost to compute savings.
              </p>
            </div>
          </a>

          {/* Source 4 */}
          <a
            href="https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm hover:border-slate-500/60 transition-colors group"
          >
            <ExternalLink
              size={14}
              className="mt-0.5 shrink-0 text-slate-500 group-hover:text-blue-400 transition-colors"
            />
            <div>
              <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                Anthropic Docs — Prompt Caching
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Explains cache write (25% extra over input rate) and cache read
                (10% of input rate) pricing, and how{' '}
                <code className="rounded bg-slate-700/60 px-1">
                  cache_creation_input_tokens
                </code>{' '}
                /{' '}
                <code className="rounded bg-slate-700/60 px-1">
                  cache_read_input_tokens
                </code>{' '}
                appear in the API usage object.
              </p>
            </div>
          </a>
        </div>

        <p className="text-xs text-slate-600">
          Prices verified May 2025. If Anthropic updates rates, edit the fields
          above — changes persist in your browser's local storage.
        </p>
      </div>
    </div>
  );
}
