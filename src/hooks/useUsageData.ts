import { useState, useEffect, useCallback, useRef } from 'react';
import { PricingSettings, TickEntry, UsageData } from '../types';

// Default tick interval: 90 seconds (1 minute 30 seconds)
const DEFAULT_INTERVAL_MS =
  parseInt(process.env.REACT_APP_REFRESH_INTERVAL || '90', 10) * 1000;

// Cap how many ticks we keep in memory so long-running tabs don't grow unbounded.
const MAX_TICKS = 500;

// Minimum incremental cost (in USD) needed to record a tick.
// Filters out floating-point noise when nothing meaningful changed.
const COST_EPSILON = 0.000001;

interface UseUsageDataResult {
  data: UsageData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  secondsUntilRefresh: number;
  intervalMs: number;
  ticks: TickEntry[];
  clearTicks: () => void;
}

function buildUrl(pricingSettings?: PricingSettings): string {
  if (!pricingSettings) return '/api/usage';
  const pricing = JSON.stringify(pricingSettings.modelPricing);
  return `/api/usage?pricing=${encodeURIComponent(pricing)}`;
}

export function useUsageData(
  autoRefresh = true,
  pricingSettings?: PricingSettings
): UseUsageDataResult {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    DEFAULT_INTERVAL_MS / 1000
  );
  const [ticks, setTicks] = useState<TickEntry[]>([]);

  // Keep pricing in a ref so fetchData always reads the latest without
  // becoming a dependency (avoids restarting the interval on every keystroke).
  const pricingRef = useRef(pricingSettings);
  pricingRef.current = pricingSettings;

  // Previous tick state — used to compute deltas for the next tick.
  const prevCostRef = useRef<number | null>(null);
  const prevTokensRef = useRef<number | null>(null);

  const fetchRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    try {
      const url = buildUrl(pricingRef.current);
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: UsageData = await res.json();
      if (id === fetchRef.current) {
        // ── Tick detection ────────────────────────────────────────────────────
        const newCost = json.computedCosts.totalApiCost;
        const newTokens = json.totalStats.grandTotal;

        if (
          prevTokensRef.current !== null &&
          prevCostRef.current !== null &&
          newTokens > prevTokensRef.current
        ) {
          const deltaCost = newCost - prevCostRef.current;
          const deltaTokens = newTokens - prevTokensRef.current;
          if (deltaCost > COST_EPSILON) {
            const entry: TickEntry = {
              id: `tick-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp: json.timestamp,
              deltaCost,
              deltaTokens,
              totalApiCost: newCost,
              currentPeriodCost: json.computedCosts.currentPeriodCost,
              intervalMs: DEFAULT_INTERVAL_MS,
            };
            setTicks((prev) => [entry, ...prev].slice(0, MAX_TICKS));
          }
        }

        prevCostRef.current = newCost;
        prevTokensRef.current = newTokens;

        setData(json);
        setError(null);
        setLastUpdated(new Date());
        setSecondsUntilRefresh(DEFAULT_INTERVAL_MS / 1000);
      }
    } catch (err: any) {
      if (id === fetchRef.current) {
        setError(err.message || 'Failed to load usage data');
      }
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, []); // stable — reads pricing from ref

  const clearTicks = useCallback(() => setTicks([]), []);

  // Initial fetch + interval
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      timerRef.current = setInterval(fetchData, DEFAULT_INTERVAL_MS);

      countdownRef.current = setInterval(() => {
        setSecondsUntilRefresh((s) => {
          if (s <= 1) return DEFAULT_INTERVAL_MS / 1000;
          return s - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchData, autoRefresh]);

  // Re-fetch whenever pricing settings change (after initial mount)
  const isFirstMount = useRef(true);
  const pricingKey = pricingSettings
    ? JSON.stringify(pricingSettings)
    : '__default__';

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingKey]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
    secondsUntilRefresh,
    intervalMs: DEFAULT_INTERVAL_MS,
    ticks,
    clearTicks,
  };
}
