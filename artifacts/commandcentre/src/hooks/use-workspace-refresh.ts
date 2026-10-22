import { useEffect, useRef } from "react";
import { WORKSPACE_CHANGED } from "@/lib/workspace-refresh";

/** Refresh legacy fetch-based panels after writes and while they remain open. */
export function useWorkspaceRefresh(refresh: () => void) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    const run = () => { if (!document.hidden && navigator.onLine) callback.current(); };
    window.addEventListener(WORKSPACE_CHANGED, run);
    window.addEventListener("focus", run);
    const timer = window.setInterval(run, 30_000);
    return () => {
      window.removeEventListener(WORKSPACE_CHANGED, run);
      window.removeEventListener("focus", run);
      window.clearInterval(timer);
    };
  }, []);
}
