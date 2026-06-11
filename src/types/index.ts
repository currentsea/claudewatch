// ── Domain types for ClaudeWatch dashboard ────────────────────────────────────

export type SubscriptionTier = number;

// ── Custom pricing / settings ─────────────────────────────────────────────────

export interface ModelPricingValues {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

export interface PricingSettings {
  modelPricing: {
    fable: ModelPricingValues;
    opus: ModelPricingValues;
    sonnet: ModelPricingValues;
    haiku: ModelPricingValues;
  };
  subscriptionTiers: {
    pro: number;
    max5x: number;
    max20x: number;
  };
  /** Estimated monthly cost (USD) for Anthropic to deliver the Claude Design feature. */
  claudeDesignMonthlyCost: number;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ModelCostEntry {
  cost: number;
  tokens: TokenCounts;
  tier: 'fable' | 'opus' | 'sonnet' | 'haiku';
  displayName: string;
  color: string;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  totalTokens: number;
  estimatedCost: number;
  inBillingPeriod: boolean;
}

export interface MonthlyRollup {
  month: string;
  tokens: number;
  apiCost: number;
  days: number;
}

export interface Session {
  sessionId: string;
  project: string;
  isSubagent: boolean;
  timestamp: string | null;
  lastActivity: string | null;
  messageCount: number;
  models: Record<string, TokenCounts>;
  totalTokens: TokenCounts;
  estimatedCost: number;
}

export interface ComputedCosts {
  totalApiCost: number;
  byModel: Record<string, ModelCostEntry>;
  currentPeriodCost: number;
  currentPeriodTokens: TokenCounts;
}

export interface TotalStats {
  totalMessages: number;
  totalSessions: number;
  firstSessionDate: string | null;
  hourCounts: Record<string, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheRead: number;
  totalCacheCreate: number;
  grandTotal: number;
}

export type NoDataReason = 'missing-claude-dir' | 'no-sessions' | 'no-stats-cache';

export interface UsageData {
  timestamp: string;
  billingPeriodStart: string;
  billingDay: number;
  totalStats: TotalStats;
  computedCosts: ComputedCosts;
  dailyActivity: DailyActivity[];
  monthlyRollup: MonthlyRollup[];
  sessions: Session[];
  activeSessions: ActiveSession[];
  modelPricing: Record<string, ModelPricing>;
  /** Path the server is reading from (echoed back for diagnostics). */
  claudeDataPath: string;
  /** True when the server found a usable Claude data dir with sessions. */
  claudeDataAvailable: boolean;
  /** When claudeDataAvailable === false, why. */
  noDataReason?: NoDataReason;
}

export interface ActiveSession {
  sessionId: string;
  project: string;
  firstActivity: string | null;
  lastActivity: string | null;
  minutesSinceLastActivity: number;
  estimatedCost: number;
  totalTokens: TokenCounts;
  messageCount: number;
  windowEndsAt: string;
  windowRemainingMs: number;
  windowElapsedMs: number;
  windowHours: number;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  timestamp: string | null;
  model?: string;
  tokens?: TokenCounts;
  toolUses?: number;
  preview: string;
}

export interface SessionDetail extends Session {
  cwd: string | null;
  gitBranch: string | null;
  userMessageCount: number;
  toolUseCount: number;
  messages: SessionMessage[];
}

export interface ModelPricing {
  displayName: string;
  color: string;
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

// ── Aggregates (SQLite-backed) ────────────────────────────────────────────────

export interface PriceHistoryEntry {
  tier: 'fable' | 'opus' | 'sonnet' | 'haiku';
  dimension: 'input' | 'output' | 'cacheCreation' | 'cacheRead';
  rate: number;
  effectiveFrom: string; // ISO date
  source: string;
}

export interface AggregateRow {
  project: string;
  month: string;       // "2026-05"
  tier: 'fable' | 'opus' | 'sonnet' | 'haiku' | 'unknown';
  sessions: number;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  apiCost: number;
}

export interface AggregatesPayload {
  rows: AggregateRow[];
  totals: {
    sessions: number;
    messages: number;
    tokens: number;
    apiCost: number;
  };
}
