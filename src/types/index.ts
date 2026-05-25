// ── Domain types for BurnItDown dashboard ─────────────────────────────────────

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
    opus: ModelPricingValues;
    sonnet: ModelPricingValues;
    haiku: ModelPricingValues;
  };
  subscriptionTiers: {
    pro: number;
    max5x: number;
    max20x: number;
  };
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
  tier: 'opus' | 'sonnet' | 'haiku';
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

/**
 * A "tick" entry — one entry per refresh-interval poll where new tokens were
 * consumed since the previous tick.
 */
export interface TickEntry {
  id: string;
  timestamp: string;
  deltaCost: number;          // incremental API cost since previous tick
  deltaTokens: number;        // incremental grand-total tokens since previous tick
  totalApiCost: number;       // running all-time API-equivalent cost
  currentPeriodCost: number;  // running cost for the current billing period
  intervalMs: number;         // how long the tick interval was at the time
}
