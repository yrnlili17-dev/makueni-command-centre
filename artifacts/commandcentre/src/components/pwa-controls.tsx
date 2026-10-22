import { useEffect, useState } from "react";
import { Download, WifiOff, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyAppUpdate, getPwaState, PWA_STATUS } from "@/lib/pwa";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaControls() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [help, setHelp] = useState(false);
  const [status, setStatus] = useState(getPwaState);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () => setInstalled(media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const connected = () => setOnline(navigator.onLine);
    const update = () => setStatus(getPwaState());
    const completed = () => { setInstalled(true); setPrompt(null); };
    checkInstalled(); update();
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", completed);
    window.addEventListener("online", connected);
    window.addEventListener("offline", connected);
    window.addEventListener(PWA_STATUS, update);
    media.addEventListener("change", checkInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", completed);
      window.removeEventListener("online", connected); window.removeEventListener("offline", connected); window.removeEventListener(PWA_STATUS, update);
      media.removeEventListener("change", checkInstalled);
    };
  }, []);
  async function install() {
    if (!prompt) { setHelp(true); return; }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
    } catch { setPrompt(null); setHelp(true); }
  }
  return <>
    <div className="cc-app-tools">
      {!online && <span role="status" className="cc-offline-status"><WifiOff size={15} />Offline · live data unavailable</span>}
      {online && status.ready && <span className="cc-cached-status">App files saved</span>}
      {status.waiting && <button type="button" onClick={() => { if (window.confirm("Save any unfinished work before updating. Reload the app now?")) applyAppUpdate(); }}><RefreshCw size={15} />Update app</button>}
      {!installed && <button type="button" onClick={() => void install()}><Download size={15} />Install app</button>}
    </div>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Install Makueni Command Centre</DialogTitle><DialogDescription>Keep the app on your home screen and reduce repeat downloads.</DialogDescription></DialogHeader>
      <ol className="list-decimal pl-5 space-y-3 text-sm"><li><strong>Android:</strong> open this site in Chrome, then use its menu → Install app or Add to Home screen.</li><li><strong>iPhone/iPad:</strong> open in Safari, tap Share → Add to Home Screen → Add.</li><li><strong>Computer:</strong> use the install icon in a supported browser’s address bar.</li></ol>
      <p className="text-xs text-muted-foreground">Open once online to save the app files. Protected records, sign-in and report submissions still need a connection. Offline submissions are not queued.</p>
      {status.unavailable && <p className="text-xs text-amber-500">App files could not be saved. Reconnect and reload to retry.</p>}
    </DialogContent></Dialog>
  </>;
}
