"use client";

import { useEffect, useState } from "react";

export function usePollingTick(intervalMs: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
