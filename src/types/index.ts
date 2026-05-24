// ── Domain types for BurnItDown dashboard ─────────────────────────────────────

export type SubscriptionTier = 20 | 100 | 200;

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
  modelPricing: Record<string, ModelPricing>;
}

export interface ModelPricing {
  displayName: string;
  color: string;
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}
