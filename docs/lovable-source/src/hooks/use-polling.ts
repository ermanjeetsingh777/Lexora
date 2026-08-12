import { useEffect, useRef } from "react";

type Options = {
  intervalMs: number;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
  runImmediately?: boolean;
};

/**
 * usePolling — invokes `callback` on an interval, pausing when the tab is
 * hidden (opt-in) and resuming with an immediate tick when it becomes visible.
 */
export function usePolling(callback: () => void, options: Options) {
  const { intervalMs, enabled = true, pauseWhenHidden = true, runImmediately = true } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => savedCallback.current();

    const start = () => {
      if (timer != null) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer == null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.hidden) {
        if (pauseWhenHidden) stop();
      } else {
        tick();
        start();
      }
    };

    if (runImmediately) tick();

    if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) {
      // stay paused until visible
    } else {
      start();
    }

    if (pauseWhenHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      stop();
      if (pauseWhenHidden && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [intervalMs, enabled, pauseWhenHidden, runImmediately]);
}
