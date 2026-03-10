import { useCallback, useMemo, useState } from "react";

/**
 * Хук для синхронизации состояния с query-параметрами URL.
 * Без react-router: window.location + history.replaceState.
 */
export function useSearchParams() {
  const [, forceUpdate] = useState(0);
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const get = useCallback((key: string): string | null => params.get(key), [params]);

  const set = useCallback((updates: Record<string, string | number | undefined | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    const qs = next.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
    forceUpdate((v) => v + 1);
  }, []);

  return { get, set, params };
}
