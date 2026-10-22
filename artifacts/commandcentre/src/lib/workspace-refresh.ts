// Publish only a change signal: never broadcast records or credentials.
export const WORKSPACE_CHANGED = "makueni:workspace-changed";

export function isWorkspaceWrite(input: RequestInfo | URL, init: RequestInit | undefined, origin: string): boolean {
  const request = typeof Request !== "undefined" && input instanceof Request ? input : undefined;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  const url = new URL(request?.url ?? String(input), origin);
  return url.origin === origin && /\/api\//.test(url.pathname) && !/\/api\/auth\//.test(url.pathname);
}

export function installWorkspaceRefresh(invalidate: () => void): () => void {
  const original = window.fetch;
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("makueni-workspace");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      invalidate();
      window.dispatchEvent(new Event(WORKSPACE_CHANGED));
    }, 200);
  };
  const wrapped: typeof fetch = async (input, init) => {
    const response = await original.call(window, input, init);
    if (response.ok && isWorkspaceWrite(input, init, window.location.origin)) {
      changed();
      channel?.postMessage("changed");
    }
    return response;
  };
  window.fetch = wrapped;
  if (channel) channel.onmessage = changed;
  return () => {
    if (window.fetch === wrapped) window.fetch = original;
    clearTimeout(timer);
    channel?.close();
  };
}
