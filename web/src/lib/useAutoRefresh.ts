"use client";

import * as React from "react";

/**
 * Fires `callback` every `intervalMs` milliseconds automatically, and
 * returns the live seconds-until-next-refresh so a UI indicator can show
 * a countdown. Also returns a manual `refresh` that resets the timer.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 30_000) {
  const total = Math.round(intervalMs / 1000);
  const [secondsLeft, setSecondsLeft] = React.useState(total);
  // Starts as `null` on purpose: the server render and the first client
  // render both need to produce the exact same markup, but the server has
  // no way of knowing the "real" client time. Setting this eagerly via
  // `useState(() => new Date())` runs the initializer once on the server
  // and again on the client, producing two different timestamps and a
  // hydration mismatch. It's filled in by the effect below, which only
  // ever runs on the client, after hydration.
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);
  const cbRef = React.useRef(callback);
  cbRef.current = callback;

  const refresh = React.useCallback(() => {
    cbRef.current();
    setLastRefreshed(new Date());
    setSecondsLeft(total);
  }, [total]);

  // Record the first "last refreshed" timestamp once mounted on the client.
  React.useEffect(() => {
    setLastRefreshed(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The interval only decrements the counter. The updater passed to
  // setSecondsLeft must stay pure — no calling other setters or `cbRef`
  // from in here. React can invoke updater functions outside of normal
  // effect timing, which is what caused "Cannot update a component while
  // rendering a different component": cbRef.current() (which sets state
  // on whatever owns `callback`) was firing during LiveRefreshIndicator's
  // render instead of after it.
  React.useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [total]);

  // Do the actual refresh as its own effect once the countdown hits zero.
  // Side effects belong here, not inside the updater above.
  React.useEffect(() => {
    if (secondsLeft === 0) {
      refresh();
    }
  }, [secondsLeft, refresh]);

  return { secondsLeft, total, lastRefreshed, refresh };
}
