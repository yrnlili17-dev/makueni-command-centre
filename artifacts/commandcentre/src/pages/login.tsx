import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, AlertTriangle, Eye, EyeOff } from "lucide-react";
import brandIcon from "@assets/brand-icon.png";
import { useAuth } from "@/lib/auth";
import "./access.css";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (!loading && user) setLocation("/dashboard"); }, [loading, user, setLocation]);
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try { await login(identifier.trim(), password); setLocation("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in. Please check your credentials."); }
    finally { setSubmitting(false); }
  };
  return <main className="cc-access">
    <section className="cc-access-panel" aria-labelledby="access-title">
      <div className="cc-access-inner">
        <Link href="/" className="cc-access-brand"><img src={brandIcon} alt="Makueni Command Centre home" /></Link>
        <h1 id="access-title">Makueni Command Centre <span>OS</span></h1>
        <p className="cc-access-caption">One workspace for the entire team.</p>
        <form className="cc-access-form" onSubmit={handleLogin}>
          <div><label htmlFor="operative-id">Operative ID (username or email)</label><input id="operative-id" type="text" autoComplete="username" placeholder="username or name@example.com" value={identifier} onChange={e => { setIdentifier(e.target.value); setError(""); }} required /></div>
          <div><label htmlFor="passcode">Passcode</label><div className="cc-password-field"><input id="passcode" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your assigned passcode" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          {error && <div role="alert" className="cc-access-error"><AlertTriangle size={17} /><span>{error}</span></div>}
          <button type="submit" disabled={submitting || loading} className="cc-access-submit"><Shield size={16} />{submitting ? "AUTHENTICATING…" : "INITIALIZE UPLINK"}</button>
        </form>
        <p className="cc-access-help">Need an account or password reset?<br /><span>Contact your system administrator.</span></p>
        <Link href="/" className="cc-access-back">← Back to Makueni Command Centre</Link>
      </div>
    </section>
    <aside className="cc-access-visual" aria-label="Makueni workspace"><div><strong>MC_OS</strong><span>Makueni County</span><p>[ SECURE ACCESS ]<br />[ TEAM WORKSPACE ]<br />[ ROLE BASED PERMISSIONS ]</p></div></aside>
  </main>;
}
