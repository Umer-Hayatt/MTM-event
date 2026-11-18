"use client";

import { useEffect, useState } from "react";

/**
 * A ticking Date.now(), only while `active` (so idle panels cost nothing).
 * Starts at 0 and reads the clock only inside the effect, so prerendering never sees Date.now().
 */
export function useNow(active: boolean, intervalMs = 100) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, intervalMs);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [active, intervalMs]);
  return now;
}
