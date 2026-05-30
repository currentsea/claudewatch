import React from 'react';
import {
  AlertCircle,
  Terminal,
  Folder,
  ExternalLink,
  GitBranch,
  Download,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

interface Props {
  reason: 'missing-claude-dir' | 'no-sessions' | 'no-stats-cache';
  claudeDataPath?: string;
  onRetry?: () => void;
}

/**
 * Renders when the server can't find any Claude usage data on disk.
 * Walks the user through installing Claude Code and running ClaudeWatch
 * locally so they have something to look at.
 */
export function NoDataInstall({
  reason,
  claudeDataPath = '~/.claude',
  onRetry,
}: Props) {
  const isMissing = reason === 'missing-claude-dir';
  const headline = isMissing
    ? 'No ~/.claude directory found'
    : reason === 'no-sessions'
    ? 'No Claude sessions detected yet'
    : 'No stats cache found';

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-500/40 bg-amber-500/10">
            <AlertCircle size={32} className="text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          {headline}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 leading-relaxed">
          ClaudeWatch reads your local{' '}
          <code className="rounded bg-slate-800/60 px-1.5 text-slate-300">
            {claudeDataPath}
          </code>{' '}
          directory. Before you can see any dashboards, you need Claude Code
          installed and at least one session recorded on this machine.
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
          >
            <RefreshCw size={14} /> Re-check for data
          </button>
        )}
      </div>

      {/* Step 1 — Install Claude Code */}
      <Section title="1. Install Claude Code" icon={Download}>
        <p className="text-sm text-slate-400">
          Claude Code is the CLI that writes the session files ClaudeWatch
          analyses. Pick whichever install method matches your platform:
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CodeBlock label="macOS (Homebrew)">
            brew install anthropics/claude/claude
          </CodeBlock>
          <CodeBlock label="npm (cross-platform)">
            npm install -g @anthropic-ai/claude-code
          </CodeBlock>
        </div>
        <p className="text-xs text-slate-500">
          See the official docs at{' '}
          <a
            href="https://docs.claude.com/en/docs/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 underline-offset-2 hover:underline"
          >
            docs.claude.com/en/docs/claude-code
            <ExternalLink size={10} />
          </a>{' '}
          for the latest install steps for Windows / Linux.
        </p>
      </Section>

      {/* Step 2 — Use Claude Code at least once */}
      <Section title="2. Start a Claude Code session" icon={Terminal}>
        <p className="text-sm text-slate-400">
          Open a terminal and run <code className="rounded bg-slate-800/60 px-1 text-slate-300">claude</code>{' '}
          in any project directory. Have a short conversation and exit.
          That writes one JSONL session file to{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">
            {claudeDataPath}/projects/
          </code>{' '}
          — exactly what ClaudeWatch reads.
        </p>
        <CodeBlock label="Example">
          cd ~/my-project &amp;&amp; claude
        </CodeBlock>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {[
            'Claude.ai web sessions also populate ~/.claude when you use the Desktop app',
            'Sessions are stored on disk; nothing is uploaded',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle size={11} /> {t}
            </span>
          ))}
        </div>
      </Section>

      {/* Step 3 — Run ClaudeWatch */}
      <Section title="3. Run ClaudeWatch locally" icon={GitBranch}>
        <p className="text-sm text-slate-400">
          If you haven't already cloned ClaudeWatch, do that and start the
          dashboard. The backend reads from{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">{claudeDataPath}</code>;
          the frontend serves on{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">localhost:3000</code>.
        </p>
        <CodeBlock label="Clone">
          git clone https://github.com/currentsea/claudewatch.git &amp;&amp; cd claudewatch
        </CodeBlock>
        <CodeBlock label="Install dependencies">
          npm install
        </CodeBlock>
        <CodeBlock label="Start (API server + UI)">
          npm start
        </CodeBlock>
        <p className="text-xs text-slate-500">
          Set{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">CLAUDE_DATA_PATH</code>{' '}
          in a{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">.env</code>{' '}
          file if your Claude data lives somewhere other than{' '}
          <code className="rounded bg-slate-800/60 px-1 text-slate-300">{claudeDataPath}</code>.
        </p>
      </Section>

      {/* Step 4 — Verify */}
      <Section title="4. Verify ClaudeWatch sees your data" icon={Folder}>
        <p className="text-sm text-slate-400">
          Once you've run Claude Code at least once, click the{' '}
          <strong className="text-white">Re-check for data</strong> button at
          the top of this page (or just refresh the browser). You should see
          your dashboards populate.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 transition-all hover:bg-emerald-500/30"
          >
            <RefreshCw size={14} /> Check again
          </button>
        )}
      </Section>

      {/* Links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ExternalLinkCard
          href="https://github.com/currentsea/claudewatch"
          label="ClaudeWatch on GitHub"
          desc="Source &amp; releases"
        />
        <ExternalLinkCard
          href="https://docs.claude.com/en/docs/claude-code"
          label="Claude Code docs"
          desc="Install &amp; usage guide"
        />
        <ExternalLinkCard
          href="https://github.com/currentsea/claudewatch/issues"
          label="Report an issue"
          desc="Help us improve"
        />
      </div>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-emerald-400" />
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CodeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-900/70 p-3">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <code className="block whitespace-pre-wrap break-all font-mono text-xs text-amber-300">
        {children}
      </code>
    </div>
  );
}

function ExternalLinkCard({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-black/10 p-4 transition-all hover:border-slate-600 hover:bg-black/20"
    >
      <ExternalLink size={16} className="text-slate-400" />
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </a>
  );
}
