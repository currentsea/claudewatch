# 🔥 BurnItDown — Claude Usage Dashboard

A real-time dashboard that reads your local **Claude Code** (`~/.claude`) data files, calculates the API-equivalent cost of every token you have consumed, and compares it against your flat-rate subscription — so you can see exactly whether you are burning through value or leaving money on the table.

---

## Features

| Feature | Detail |
|---|---|
| 📊 **Live polling** | Re-reads `~/.claude` every 10 s (configurable) |
| 💰 **Cost estimation** | Computes API-equivalent spend using public Anthropic pricing |
| 🔥 **Burn meter** | Projects current-period usage to a full month and shows delta vs subscription |
| 📅 **Billing period** | Configurable start day so numbers align with your actual renewal date |
| 🤖 **Model breakdown** | Opus / Sonnet / Haiku split with per-model pricing |
| 📈 **Charts** | Daily token usage, monthly cost bars, token type breakdown |
| 🗂️ **Session browser** | Sortable table of every session with cache-hit rate + API cost |
| 🎨 **Responsive dark UI** | Tailwind CSS, works on desktop and mobile |

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 18 |
| npm | >= 9 |
| Claude Code CLI | installed and used at least once |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Optional: copy and edit the environment file
cp .env.example .env

# 3. Start both servers with one command
npm start
```

`npm start` launches:
- **Backend API** on `http://localhost:3001` — reads `~/.claude`
- **React frontend** on `http://localhost:3000` — auto-opens in your browser

You can also run them separately:

```bash
npm run server   # start only the API server
npm run client   # start only the React dev server
```

---

## Configuration

Copy `.env.example` to `.env` and override any variables you need.

### Backend variables (read by `server/index.js`)

| Variable | Default | Description |
|---|---|---|
| `CLAUDE_DATA_PATH` | `~/.claude` | Absolute path to your Claude Code data directory. Only change if you moved it. |
| `SERVER_PORT` | `3001` | TCP port for the Express API server. If you change this, also update the `proxy` field in `package.json`. |
| `BILLING_DAY` | `1` | Day-of-month when your Anthropic subscription renews. E.g. `15` if you subscribed on the 15th. |

### Frontend variables (REACT_APP_* are baked in at build time)

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_REFRESH_INTERVAL` | `10` | Polling interval in **seconds**. Lower = more real-time. Minimum recommended: 5. |

---

## Subscription tiers

Toggle between three reference tiers in the dashboard header:

| Tier | Monthly cost | Typical plan |
|---|---|---|
| **Pro** | $20 | Claude.ai Pro (individual) |
| **Max 5x** | $100 | Claude.ai Max (5x usage) |
| **Max 20x** | $200 | Claude.ai Max (20x usage) |

The dashboard computes the **API-equivalent** cost of your actual usage and shows the net savings (or deficit) vs the selected tier.

---

## How cost estimation works

For each assistant message in `~/.claude/projects/**/*.jsonl`, the server reads the `usage` block and multiplies by public Anthropic API rates (2025):

| Model | Input | Output | Cache write | Cache read |
|---|---|---|---|---|
| **Opus** | $15/M | $75/M | $18.75/M | $1.50/M |
| **Sonnet** | $3/M | $15/M | $3.75/M | $0.30/M |
| **Haiku** | $0.80/M | $4/M | $1.00/M | $0.08/M |

These are estimates — your Claude.ai subscription is flat-rate. The numbers show what the same usage would cost on pay-per-use API billing.

To update rates, edit `MODEL_PRICING` at the top of **`server/index.js`**.

---

## Project structure

```
burnitdown/
├── server/
│   └── index.js               # Express API server
├── src/
│   ├── App.tsx                 # Main dashboard
│   ├── index.css               # Tailwind directives
│   ├── types/index.ts
│   ├── utils/pricing.ts
│   ├── hooks/useUsageData.ts   # Polling hook
│   └── components/
│       ├── StatCard.tsx
│       ├── UsageChart.tsx
│       ├── ModelBreakdown.tsx
│       ├── CostComparison.tsx
│       ├── BurnMeter.tsx
│       ├── TokenBreakdown.tsx
│       ├── SessionsTable.tsx
│       └── SubscriptionSelector.tsx
├── .env.example
├── tailwind.config.js
└── package.json
```

---

## License

MIT
