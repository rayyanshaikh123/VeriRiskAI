import { useMemo } from "react";

export function useBackoff(initialMs = 400, maxMs = 3000) {
  return useMemo(() => {
    let delay = initialMs;
    return {
      nextDelay() {
        const current = delay;
        delay = Math.min(delay * 1.5, maxMs);
        return current;
      },
      reset() {
        delay = initialMs;
      },
    };
  }, [initialMs, maxMs]);
}
