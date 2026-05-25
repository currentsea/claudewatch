import React from 'react';
import {
  Flame,
  Terminal,
  Download,
  ExternalLink,
  GitBranch,
  Server,
  Globe,
  CheckCircle,
  ChevronRight,
  Code,
  Cpu,
  DollarSign,
  BarChart2,
  Shield,
  Lock,
} from 'lucide-react';

function Step({
  number,
  title,
  description,
  code,
}: {
  number: number;
  title: string;
  description: string;
  code?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 border border-orange-500/40 text-sm font-bold text-orange-400">
        {number}
      </div>
      <div className="flex-1 pb-6 border-b border-slate-700/40 last:border-0">
        <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
        <p className="mb-3 text-sm text-slate-400 leading-relaxed">{description}</p>
        {code && (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 font-mono text-sm text-amber-300">
            <code>{code}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bg,
  border,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${bg} ${border}`}>
      <div className={`mb-3 w-fit rounded-xl p-2.5 ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <h3 className={`mb-1.5 text-sm font-semibold ${color}`}>{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="mb-5 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-500/30">
            <Flame size={40} className="text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white">
          BurnItDown
        </h1>
        <p className="mx-auto mb-2 max-w-xl text-lg text-slate-400 leading-relaxed">
          The open-source Claude usage analytics dashboard that answers one question:
        </p>
        <p className="mx-auto mb-6 max-w-xl text-xl font-semibold text-amber-300 italic leading-relaxed">
          "Is my Claude subscription actually worth it?"
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="https://github.com/currentsea/claudewatch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-400 transition-all"
          >
            <GitBranch size={16} /> View on GitHub
          </a>
          <a
            href="https://github.com/currentsea/claudewatch/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
          >
            <Download size={16} /> Download Latest
          </a>
        </div>
      </div>

      {/* What is it? */}
      <div className="mb-10 rounded-2xl border border-slate-700/60 bg-black/10 p-6 backdrop-blur-sm">
        <h2 className="mb-3 text-base font-bold text-white">What is BurnItDown?</h2>
        <p className="mb-4 text-sm text-slate-400 leading-relaxed">
          BurnItDown reads your local Claude session files (from{' '}
          <code className="rounded bg-slate-800/60 px-1.5 text-slate-300">~/.claude/projects</code>),
          calculates what your usage <em>would have cost</em> at Anthropic's published API rates,
          and compares that to your flat-rate subscription. You can instantly see whether
          you're getting your money's worth — or whether Anthropic is subsidising your usage.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            '100% local — your data never leaves your machine',
            'No account needed',
            'Free & open source (MIT)',
            'Works with Claude Pro, Max 5×, Max 20×',
          ].map((point) => (
            <div key={point} className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle size={12} />
              {point}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Features
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={DollarSign}
            title="Real-time cost tracking"
            description="See exactly what your Claude usage would cost at API rates, updated every 90 seconds."
            color="text-amber-400"
            bg="bg-amber-500/10"
            border="border-amber-500/30"
          />
          <FeatureCard
            icon={BarChart2}
            title="Subscription ROI"
            description="Compare your actual API equivalent cost against your subscription fee to understand your value."
            color="text-blue-400"
            bg="bg-blue-500/10"
            border="border-blue-500/30"
          />
          <FeatureCard
            icon={Cpu}
            title="Per-model breakdown"
            description="See costs broken down by Opus, Sonnet, and Haiku with token-level granularity."
            color="text-violet-400"
            bg="bg-violet-500/10"
            border="border-violet-500/30"
          />
          <FeatureCard
            icon={Globe}
            title="Active session monitoring"
            description="Track live usage windows in real time, with 5-hour rolling window tracking."
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            border="border-emerald-500/30"
          />
          <FeatureCard
            icon={Lock}
            title="Fully private"
            description="Everything runs locally on your machine. Zero telemetry, no external API calls, no accounts."
            color="text-cyan-400"
            bg="bg-cyan-500/10"
            border="border-cyan-500/30"
          />
          <FeatureCard
            icon={Shield}
            title="Open source"
            description="MIT licensed. Audit every line of code. No black boxes, no hidden tracking."
            color="text-rose-400"
            bg="bg-rose-500/10"
            border="border-rose-500/30"
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="mb-10 rounded-2xl border border-slate-700/60 bg-black/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-base font-bold text-white">Requirements</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: Code,
              label: 'Node.js',
              detail: 'v18 or newer',
              color: 'text-green-400',
            },
            {
              icon: Terminal,
              label: 'npm',
              detail: 'v9 or newer',
              color: 'text-blue-400',
            },
            {
              icon: Flame,
              label: 'Claude Code',
              detail: 'or Claude.ai active session files',
              color: 'text-orange-400',
            },
          ].map(({ icon: Icon, label, detail, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-black/20 px-4 py-3"
            >
              <Icon size={18} className={color} />
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Installation steps */}
      <div className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Installation
        </h2>

        <div className="mt-4 rounded-2xl border border-slate-700/60 bg-black/10 p-6 backdrop-blur-sm">
          <div className="space-y-6">
            <Step
              number={1}
              title="Clone the repository"
              description="Open your terminal and clone BurnItDown from GitHub."
              code="git clone https://github.com/currentsea/claudewatch.git && cd claudewatch"
            />
            <Step
              number={2}
              title="Install dependencies"
              description="Install the required Node.js packages using npm."
              code="npm install"
            />
            <Step
              number={3}
              title="Start the application"
              description="This single command starts both the backend API server (port 3001) and the React frontend (port 3000). Your browser will open automatically."
              code="npm start"
            />
            <Step
              number={4}
              title="Open the dashboard"
              description="If your browser doesn't open automatically, navigate to the dashboard URL."
              code="http://localhost:3000"
            />
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Configuration
        </h2>

        <div className="mt-4 rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
          <p className="mb-4 text-sm text-slate-400">
            BurnItDown works out of the box with zero configuration. Optional environment
            variables let you customise behaviour:
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-700/40 bg-black/20">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/40">
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Variable</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Default</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700/30">
                  <td className="px-4 py-2.5 font-mono text-amber-300">CLAUDE_DATA_PATH</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">~/.claude</td>
                  <td className="px-4 py-2.5">Path to your Claude data directory</td>
                </tr>
                <tr className="border-b border-slate-700/30">
                  <td className="px-4 py-2.5 font-mono text-amber-300">BILLING_DAY</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">1</td>
                  <td className="px-4 py-2.5">Day of month your billing period starts</td>
                </tr>
                <tr className="border-b border-slate-700/30">
                  <td className="px-4 py-2.5 font-mono text-amber-300">PORT</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">3001</td>
                  <td className="px-4 py-2.5">API server port</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono text-amber-300">CLAUDE_USAGE_WINDOW_HOURS</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">5</td>
                  <td className="px-4 py-2.5">Rolling usage window for active sessions (hours)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Create a{' '}
            <code className="rounded bg-slate-800/60 px-1 text-slate-300">.env</code>{' '}
            file in the project root to set these values persistently.
          </p>
        </div>
      </div>

      {/* Privacy */}
      <div className="mb-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Lock size={16} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-emerald-400">100% Private by Design</h2>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          BurnItDown reads only the JSONL files in your{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">~/.claude/projects</code>{' '}
          directory. These files exist on your machine because Claude Code writes them locally.
          No data is ever transmitted to any external server. The backend runs entirely on
          <code className="rounded bg-slate-800/60 px-1 text-slate-300 mx-1">localhost</code>
          — not the internet.
        </p>
      </div>

      {/* Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: GitBranch,
            label: 'Source Code',
            href: 'https://github.com/currentsea/claudewatch',
            desc: 'Full repository on GitHub',
            color: 'text-slate-300',
          },
          {
            icon: ExternalLink,
            label: 'Releases',
            href: 'https://github.com/currentsea/claudewatch/releases',
            desc: 'Download tagged releases',
            color: 'text-blue-400',
          },
          {
            icon: Server,
            label: 'Issues & Feedback',
            href: 'https://github.com/currentsea/claudewatch/issues',
            desc: 'Bug reports & feature requests',
            color: 'text-amber-400',
          },
        ].map(({ icon: Icon, label, href, desc, color }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-black/10 p-4 transition-all hover:border-slate-600 hover:bg-black/20"
          >
            <Icon size={18} className={color} />
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-slate-600" />
          </a>
        ))}
      </div>
    </div>
  );
}
