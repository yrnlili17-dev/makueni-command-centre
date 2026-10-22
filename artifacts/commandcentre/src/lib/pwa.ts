export const PWA_STATUS = "makueni:pwa-status";
export type PwaState = { ready: boolean; waiting: boolean; unavailable: boolean };
let state: PwaState = { ready: false, waiting: false, unavailable: false };
let registration: ServiceWorkerRegistration | undefined;
export const getPwaState = () => state;
function publish(update: Partial<PwaState>) {
  state = { ...state, ...update };
  window.dispatchEvent(new Event(PWA_STATUS));
}
export async function registerAppWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: "none" });
    publish({ ready: !!registration.active, waiting: !!registration.waiting });
    registration.addEventListener("updatefound", () => {
      const worker = registration?.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") publish({ ready: true, waiting: !!navigator.serviceWorker.controller });
      });
    });
    await navigator.serviceWorker.ready;
    publish({ ready: true, waiting: !!registration.waiting });
  } catch { publish({ unavailable: true }); }
}
export function applyAppUpdate() {
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  registration.waiting.postMessage("SKIP_WAITING");
}
