import { useState, useEffect, useCallback, useRef } from 'react';
import { UsageData } from '../types';

const DEFAULT_INTERVAL_MS =
  parseInt(process.env.REACT_APP_REFRESH_INTERVAL || '10', 10) * 1000;

interface UseUsageDataResult {
  data: UsageData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  secondsUntilRefresh: number;
}

export function useUsageData(autoRefresh = true): UseUsageDataResult {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    DEFAULT_INTERVAL_MS / 1000
  );

  const fetchRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: UsageData = await res.json();
      if (id === fetchRef.current) {
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
  }, []);

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

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
    secondsUntilRefresh,
  };
}
