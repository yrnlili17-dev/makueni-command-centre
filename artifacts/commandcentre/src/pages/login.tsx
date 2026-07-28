import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Shield, AlertTriangle, Copy, Check } from "lucide-react";
import brandIcon from "@assets/brand-icon.png";
import { useAuth } from "@/lib/auth";

const DEMO_USER = "demo";
const DEMO_PASS = "Komboa2027";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);

  useEffect(() => {
    if (!loading && user) setLocation("/dashboard");
  }, [loading, user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(identifier.trim(), password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message?.toUpperCase() || "ACCESS DENIED — INVALID CREDENTIALS.");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (value: string, field: "user" | "pass") => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden gap-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border p-8 relative z-10 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

        <div className="flex flex-col items-center mb-8">
          <img src={brandIcon} alt="Logo" className="w-16 h-16 mb-4" />
          <h1 className="text-xl font-bold tracking-widest text-foreground">KALOKI 2027 COMMAND CENTRE</h1>
          <p className="text-xs font-mono text-muted-foreground mt-2 tracking-widest">[ AUTHENTICATION_REQUIRED ]</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">OPERATIVE ID (USERNAME OR EMAIL)</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError(""); }}
              className="w-full bg-secondary border border-border p-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="username or id@campaign.org"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">PASSCODE</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              className="w-full bg-secondary border border-border p-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-[10px] font-mono text-primary tracking-wide">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 bg-green-600 text-white border border-green-500 p-3 font-mono tracking-widest text-sm hover:bg-green-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Shield className="w-4 h-4" />
            {submitting ? "AUTHENTICATING…" : "INITIALIZE UPLINK"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-4">
          <p className="text-[9px] font-mono text-muted-foreground tracking-widest">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED</p>
        </div>
      </div>

      <div className="w-full max-w-md border border-border bg-card/60 relative z-10">
        <div className="border-b border-border px-4 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Demo Access Credentials</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between bg-secondary border border-border px-3 py-2">
            <div>
              <p className="text-[9px] font-mono text-muted-foreground tracking-widest mb-0.5">USERNAME</p>
              <p className="text-sm font-mono text-foreground">{DEMO_USER}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(DEMO_USER, "user")}
              className="text-muted-foreground hover:text-primary transition-colors ml-3"
              title="Copy"
            >
              {copied === "user" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center justify-between bg-secondary border border-border px-3 py-2">
            <div>
              <p className="text-[9px] font-mono text-muted-foreground tracking-widest mb-0.5">PASSCODE</p>
              <p className="text-sm font-mono text-foreground">{DEMO_PASS}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(DEMO_PASS, "pass")}
              className="text-muted-foreground hover:text-primary transition-colors ml-3"
              title="Copy"
            >
              {copied === "pass" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
