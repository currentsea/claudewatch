import React, { useState } from 'react';
import { Heart, Copy, CheckCheck, ExternalLink } from 'lucide-react';

interface DonationMethod {
  name: string;
  icon: string;
  handle: string;
  link?: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

const DONATION_METHODS: DonationMethod[] = [
  {
    name: 'CashApp',
    icon: '💵',
    handle: '$ZOLTAR1337',
    link: 'https://cash.app/$ZOLTAR1337',
    description: 'Instant, free domestic transfers',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    name: 'PayPal',
    icon: '🅿️',
    handle: '@JoeBull856',
    link: 'https://paypal.me/JoeBull856',
    description: 'Widely accepted worldwide',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    name: 'Bitcoin (BTC)',
    icon: '₿',
    handle: 'bc1q8c3kkktkxayj7nz2mhew7jq9pm8uc3gcm9m5pq',
    description: 'Native SegWit (bech32) address',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    name: 'Monero (XMR)',
    icon: '🔐',
    handle: '89UTZrWxghP6sRRrK9J1uRH5P6KbTi9MxchZswggzcpti2tJ7fh7JCr518ZZMhP888ev7Hv5zrW7rT6gcmVy3HmvT6zDFMM',
    description: 'Privacy-preserving cryptocurrency',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  {
    name: 'Bitcoin Cash (BCH)',
    icon: '💚',
    handle: 'bitcoincash:qpmd0z8jya5ga3q3f75vtpfvya3ll6sa45aa4yfxte',
    description: 'Low-fee Bitcoin variant',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  {
    name: 'Dogecoin (DOGE)',
    icon: '🐕',
    handle: 'DM9Jim7bSJsHoJxcPDcbR9JsLoVKskDiGC',
    description: 'Such coin, very donate, wow',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  {
    name: 'Litecoin (LTC)',
    icon: '⚡',
    handle: 'ltc1qhfc8qyw0q3a336r5x0f8x3kygd7cfzgmk24e0f',
    description: 'Fast, low-cost transactions',
    color: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
  {
    name: 'Ethereum (ETH)',
    icon: '🔷',
    handle: '0x314A6b1c94aEa065970231b71342C232840C508F',
    description: 'ERC-20 compatible address',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  {
    name: 'Solana (SOL)',
    icon: '🌊',
    handle: '97GpkvovzHbbofbupVteiC8Vh9wgJuBSX1S46NDgGWit',
    description: 'High-speed, low-fee blockchain',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    name: 'Ripple (XRP)',
    icon: '💧',
    handle: 'r9f8GHx4BSchbiJmDfNh3EWuszesbMh9gT',
    description: 'Cross-border payments network',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-all text-slate-500 hover:text-white hover:bg-slate-700/60"
    >
      {copied ? (
        <>
          <CheckCheck size={12} className="text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          Copy
        </>
      )}
    </button>
  );
}

function DonationCard({ method }: { method: DonationMethod }) {
  const isLongAddress = method.handle.length > 40;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${method.bg} ${method.border}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label={method.name}>
          {method.icon}
        </span>
        <div>
          <h3 className={`text-sm font-bold ${method.color}`}>{method.name}</h3>
          <p className="text-xs text-slate-500">{method.description}</p>
        </div>
        {method.link && (
          <a
            href={method.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 px-2.5 py-1 text-xs text-slate-400 hover:border-slate-600 hover:text-white transition-all"
          >
            <ExternalLink size={11} /> Open
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-700/40 bg-black/20 px-3 py-2">
        {isLongAddress ? (
          <code className="flex-1 break-all font-mono text-xs text-slate-300 leading-relaxed">
            {method.handle}
          </code>
        ) : (
          <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm font-semibold text-slate-200">
            {method.handle}
          </code>
        )}
        <CopyButton text={method.handle} />
      </div>
    </div>
  );
}

export function DonatePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30">
            <Heart size={32} className="text-white" />
          </div>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-white">Support BurnItDown</h1>
        <p className="mx-auto max-w-xl text-base text-slate-400 leading-relaxed">
          BurnItDown is a free, open-source tool built and maintained by{' '}
          <a
            href="https://github.com/currentsea"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-200 underline underline-offset-2 hover:text-white"
          >
            Joseph Bull
          </a>
          . Any and all donations are appreciated — your support helps keep this
          project alive and growing.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          <Heart size={14} className="fill-rose-400 text-rose-400" />
          Every contribution, no matter the size, makes a difference
        </div>
      </div>

      {/* Donation methods */}
      <div className="mb-8">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Payment Methods
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DONATION_METHODS.map((method) => (
            <DonationCard key={method.name} method={method} />
          ))}
        </div>
      </div>

      {/* Thank you note */}
      <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-6 text-center backdrop-blur-sm">
        <p className="mb-2 text-sm font-semibold text-white">Thank You 🙏</p>
        <p className="text-sm text-slate-400 leading-relaxed">
          Your donation directly supports open-source development, server costs, and the
          time invested in making BurnItDown the best Claude usage analytics tool
          available. BurnItDown is and will always remain free to use.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <a
            href="https://github.com/currentsea/claudewatch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
          >
            ⭐ Star on GitHub
          </a>
          <span className="text-slate-700">·</span>
          <a
            href="https://github.com/currentsea/claudewatch/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
          >
            🐛 Report a bug
          </a>
          <span className="text-slate-700">·</span>
          <a
            href="https://github.com/currentsea/claudewatch/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
          >
            💬 Discuss
          </a>
        </div>
      </div>
    </div>
  );
}
