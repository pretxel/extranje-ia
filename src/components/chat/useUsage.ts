"use client";

import { useCallback, useEffect, useState } from "react";
import type { UsageData } from "./UsageBanner";

/**
 * Reads `/api/user` for the current plan + query usage and exposes a `refetch`
 * so callers can keep the count live after each query (instead of stale until
 * a page reload).
 */
export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  const refetch = useCallback(() => {
    fetch("/api/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UsageData | null) => {
        if (data) setUsage(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { usage, refetch };
}
