import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Shield, AlertTriangle, Mail } from "lucide-react";
import brandIcon from "@assets/brand-icon.png";
import { useAuth } from "@/lib/auth";


export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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



  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[1.04fr_0.96fr]">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden border-r border-border px-5 py-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src={brandIcon} alt="Makueni Command Centre" className="mb-5 h-16 w-16 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight">Makueni Command Centre <span className="text-primary">OS</span></h1>
            <p className="mt-3 font-mono text-xs tracking-[0.18em] text-muted-foreground">SECURE COUNTY OPERATIONS</p>
          </div>

          <div className="relative border border-border bg-card/80 p-7 shadow-2xl sm:p-9">
            <div className="absolute left-0 top-0 h-1 w-full bg-primary" />
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="operative-id" className="text-sm font-medium">Operative ID (username or email)</label>
                <input
                  id="operative-id"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError(""); }}
                  className="w-full border border-border bg-background px-3 py-3 text-sm font-mono text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="username or name@example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="passcode" className="text-sm font-medium">Passcode</label>
                <input
                  id="passcode"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  className="w-full border border-border bg-background px-3 py-3 text-sm font-mono text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="Enter your assigned passcode"
                />
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs font-mono text-primary">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 border border-emerald-500 bg-emerald-600 p-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Shield className="h-4 w-4" />
                {submitting ? "AUTHENTICATING…" : "INITIALIZE UPLINK"}
              </button>
            </form>

            <div className="mt-7 border-t border-border pt-4 text-center">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 px-2 text-sm text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Use the credentials assigned to you. Need an account or password reset? Contact your system administrator.</p>
          </div>
        </div>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-card lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative z-10 text-center">
          <div className="select-none text-[clamp(7rem,18vw,15rem)] font-black leading-none tracking-tighter text-foreground/[0.08]">MC</div>
          <div className="-mt-5 font-mono text-sm tracking-[0.3em] text-primary/60">MAKUENI COUNTY</div>
          <div className="mt-3 space-y-2 font-mono text-xs tracking-widest text-muted-foreground/70">
            <p>[ SECURE_ACCESS ]</p>
            <p>[ ROLE_BASED_PERMISSIONS ]</p>
            <p>[ AUDITABLE_OPERATIONS ]</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
