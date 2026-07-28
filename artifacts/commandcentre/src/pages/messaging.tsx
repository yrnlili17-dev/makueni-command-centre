import { useState, useEffect, useCallback } from "react";
import {
  useListCampaigns, useCreateCampaign, useDeleteCampaign, useSendCampaign,
  useGetMessagingStats, useListSegments,
  getListCampaignsQueryKey, getGetMessagingStatsQueryKey,
} from "@workspace/api-client-react";
import type { MessageCampaignInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Send, Trash2, X, Check, MessageSquare, Settings,
  Phone, Mail, ChevronDown, ChevronUp, Save, Wifi, WifiOff,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROVIDERS_API = `${BASE_URL}/api/messages/providers`;

type Channel = "sms" | "whatsapp" | "email";

interface Provider {
  id: number; channel: string; provider: string;
  apiKey?: string | null; apiSecret?: string | null; username?: string | null;
  senderId?: string | null; phoneNumber?: string | null;
  phoneNumberId?: string | null; businessAccountId?: string | null;
  smtpHost?: string | null; smtpPort?: string | null;
  smtpUser?: string | null; fromEmail?: string | null; fromName?: string | null;
  isActive: boolean; testStatus?: string | null; lastTested?: string | null;
}

const SMS_PROVIDERS = [
  { value: "africastalking", label: "Africa's Talking" },
  { value: "twilio", label: "Twilio" },
  { value: "infobip", label: "Infobip" },
  { value: "custom", label: "Custom / Other" },
];

const WA_PROVIDERS = [
  { value: "meta", label: "Meta Cloud API (WhatsApp Business)" },
  { value: "africastalking_wa", label: "Africa's Talking WhatsApp" },
  { value: "twilio_wa", label: "Twilio WhatsApp" },
];

const EMAIL_PROVIDERS = [
  { value: "sendgrid", label: "SendGrid" },
  { value: "mailchimp", label: "Mailchimp / Mandrill" },
  { value: "smtp", label: "Custom SMTP" },
  { value: "ses", label: "Amazon SES" },
];

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, string> = {
    sms: "text-blue-400 border-blue-400/30",
    whatsapp: "text-green-400 border-green-400/30",
    email: "text-purple-400 border-purple-400/30",
  };
  return (
    <span className={`font-mono text-[10px] border px-1.5 py-0.5 ${map[channel] ?? "border-border text-muted-foreground"}`}>
      {channel.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "text-muted-foreground border-border",
    scheduled: "text-yellow-400 border-yellow-400/30",
    sent: "text-green-400 border-green-400/30",
    sending: "text-blue-400 border-blue-400/30 animate-pulse",
    failed: "text-red-400 border-red-400/30",
  };
  return (
    <span className={`font-mono text-[10px] border px-1.5 py-0.5 ${map[status] ?? "border-border text-muted-foreground"}`}>
      [ {status.toUpperCase()} ]
    </span>
  );
}

function FieldInput({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono text-muted-foreground tracking-widest">{label}{required && " *"}</label>
      <input required={required} {...props} className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-none focus:border-primary" />
    </div>
  );
}

function FieldSelect({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono text-muted-foreground tracking-widest">{label}</label>
      <select {...props} className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-none focus:border-primary">
        {children}
      </select>
    </div>
  );
}

// ── SMS Provider Config ─────────────────────────────────────────────────────
function SmsConfig({ provider, onSaved }: { provider?: Provider; onSaved: () => void }) {
  const [open, setOpen] = useState(!provider?.isActive);
  const [providerVal, setProviderVal] = useState(provider?.provider ?? "africastalking");
  const [form, setForm] = useState({
    apiKey: provider?.apiKey ?? "",
    username: provider?.username ?? "",
    senderId: provider?.senderId ?? "",
    apiSecret: provider?.apiSecret ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(PROVIDERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "sms", provider: providerVal, ...form, isActive: true }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1800);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30">
        <div className="flex items-center gap-3">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">SMS PROVIDER CONFIGURATION</span>
          {provider?.isActive && (
            <span className="font-mono text-[9px] text-green-400 border border-green-400/30 px-1.5 py-0.5">
              ◆ {SMS_PROVIDERS.find(p => p.value === provider.provider)?.label ?? provider.provider}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {saved && <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs p-2">✓ SMS PROVIDER SAVED</div>}
          <form onSubmit={save} className="space-y-3">
            <FieldSelect label="SMS PROVIDER" value={providerVal} onChange={e => setProviderVal(e.target.value)}>
              {SMS_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </FieldSelect>

            {(providerVal === "africastalking" || providerVal === "custom") && (
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="API KEY" required type="password" placeholder="AT_API_KEY_..." value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                <FieldInput label="USERNAME" required placeholder="sandbox or your username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                <div className="col-span-2">
                  <FieldInput label="SENDER ID (SHORTCODE / ALPHANUMERIC)" placeholder="e.g. KALOKI or 40100" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />
                  <p className="font-mono text-[9px] text-muted-foreground mt-1">Africa's Talking registered sender ID. Leave blank to use default shared shortcode.</p>
                </div>
              </div>
            )}

            {providerVal === "twilio" && (
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="ACCOUNT SID" required type="password" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                <FieldInput label="AUTH TOKEN" required type="password" placeholder="your_auth_token" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                <div className="col-span-2">
                  <FieldInput label="FROM PHONE NUMBER" placeholder="+12065550100" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />
                </div>
              </div>
            )}

            {providerVal === "infobip" && (
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="API KEY" required type="password" placeholder="App xxxxxxxxxxxx" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                <FieldInput label="BASE URL" placeholder="xxxxx.api.infobip.com" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                <div className="col-span-2">
                  <FieldInput label="SENDER NAME / NUMBER" placeholder="KALOKI2027" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="bg-secondary border border-border p-3 font-mono text-[9px] text-muted-foreground space-y-0.5">
              {providerVal === "africastalking" && <>
                <div className="text-yellow-400 font-bold mb-1">AFRICA'S TALKING SETUP:</div>
                <div>1. Register at africastalking.com</div>
                <div>2. Create an app → copy the API key from the dashboard</div>
                <div>3. Use "sandbox" as username during testing, or your real username in production</div>
                <div>4. Request a Sender ID (shortcode/alphanumeric) through the AT dashboard</div>
              </>}
              {providerVal === "twilio" && <>
                <div className="text-yellow-400 font-bold mb-1">TWILIO SETUP:</div>
                <div>1. Create account at console.twilio.com</div>
                <div>2. Buy an SMS-enabled phone number</div>
                <div>3. Account SID and Auth Token are on the Console dashboard</div>
              </>}
              {providerVal === "infobip" && <>
                <div className="text-yellow-400 font-bold mb-1">INFOBIP SETUP:</div>
                <div>1. Register at infobip.com</div>
                <div>2. Find your API key and base URL in the portal</div>
              </>}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-white font-mono text-[10px] tracking-widest px-4 py-2 hover:bg-primary/90 disabled:opacity-50">
                <Save className="w-3 h-3" /> {saving ? "SAVING..." : "SAVE SMS CONFIG"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── WhatsApp Provider Config ────────────────────────────────────────────────
function WhatsAppConfig({ provider, onSaved }: { provider?: Provider; onSaved: () => void }) {
  const [open, setOpen] = useState(!provider?.isActive);
  const [providerVal, setProviderVal] = useState(provider?.provider ?? "meta");
  const [form, setForm] = useState({
    apiKey: provider?.apiKey ?? "",
    phoneNumberId: provider?.phoneNumberId ?? "",
    businessAccountId: provider?.businessAccountId ?? "",
    phoneNumber: provider?.phoneNumber ?? "",
    username: provider?.username ?? "",
    senderId: provider?.senderId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(PROVIDERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp", provider: providerVal, ...form, isActive: true }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1800);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30">
        <div className="flex items-center gap-3">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">WHATSAPP PROVIDER CONFIGURATION</span>
          {provider?.isActive && (
            <span className="font-mono text-[9px] text-green-400 border border-green-400/30 px-1.5 py-0.5">
              ◆ {WA_PROVIDERS.find(p => p.value === provider.provider)?.label ?? provider.provider}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {saved && <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs p-2">✓ WHATSAPP PROVIDER SAVED</div>}
          <form onSubmit={save} className="space-y-3">
            <FieldSelect label="WHATSAPP PROVIDER" value={providerVal} onChange={e => setProviderVal(e.target.value)}>
              {WA_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </FieldSelect>

            {providerVal === "meta" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldInput label="PERMANENT ACCESS TOKEN" required type="password" placeholder="EAAxxxxxxxxxxxxxxxx..." value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                  <p className="font-mono text-[9px] text-muted-foreground mt-1">Generate in Meta Business Suite → System Users → Generate Token</p>
                </div>
                <FieldInput label="PHONE NUMBER ID" required placeholder="123456789012345" value={form.phoneNumberId} onChange={e => setForm(p => ({ ...p, phoneNumberId: e.target.value }))} />
                <FieldInput label="WHATSAPP BUSINESS ACCOUNT ID" required placeholder="123456789012345" value={form.businessAccountId} onChange={e => setForm(p => ({ ...p, businessAccountId: e.target.value }))} />
                <div className="col-span-2">
                  <FieldInput label="DISPLAY PHONE NUMBER" placeholder="+254712345678" value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} />
                </div>
              </div>
            )}

            {(providerVal === "africastalking_wa") && (
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="API KEY" required type="password" placeholder="AT_API_KEY_..." value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                <FieldInput label="USERNAME" required placeholder="your_at_username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                <div className="col-span-2">
                  <FieldInput label="SENDER ID / PHONE" placeholder="+254712345678" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />
                </div>
              </div>
            )}

            {providerVal === "twilio_wa" && (
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="ACCOUNT SID" required type="password" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                <FieldInput label="AUTH TOKEN" required type="password" placeholder="your_auth_token" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                <div className="col-span-2">
                  <FieldInput label="WHATSAPP FROM NUMBER (with whatsapp: prefix)" placeholder="whatsapp:+14155238886" value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="bg-secondary border border-border p-3 font-mono text-[9px] text-muted-foreground space-y-0.5">
              {providerVal === "meta" && <>
                <div className="text-green-400 font-bold mb-1">META CLOUD API SETUP:</div>
                <div>1. Create Meta Business account at business.facebook.com</div>
                <div>2. Set up WhatsApp Business API at developers.facebook.com</div>
                <div>3. Add a phone number and complete business verification</div>
                <div>4. Create a System User and generate a Permanent Access Token</div>
                <div>5. Phone Number ID and WABA ID are in the WhatsApp Manager</div>
              </>}
              {providerVal === "africastalking_wa" && <>
                <div className="text-green-400 font-bold mb-1">AFRICA'S TALKING WHATSAPP:</div>
                <div>1. Login to africastalking.com → WhatsApp section</div>
                <div>2. Complete WhatsApp Business verification</div>
                <div>3. Use the same API key as your AT SMS account</div>
              </>}
              {providerVal === "twilio_wa" && <>
                <div className="text-green-400 font-bold mb-1">TWILIO WHATSAPP SETUP:</div>
                <div>1. Enable WhatsApp in your Twilio console</div>
                <div>2. Use Twilio sandbox for testing, or apply for a dedicated number</div>
              </>}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-white font-mono text-[10px] tracking-widest px-4 py-2 hover:bg-primary/90 disabled:opacity-50">
                <Save className="w-3 h-3" /> {saving ? "SAVING..." : "SAVE WHATSAPP CONFIG"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Email Provider Config ───────────────────────────────────────────────────
function EmailConfig({ provider, onSaved }: { provider?: Provider; onSaved: () => void }) {
  const [open, setOpen] = useState(!provider?.isActive);
  const [providerVal, setProviderVal] = useState(provider?.provider ?? "sendgrid");
  const [form, setForm] = useState({
    apiKey: provider?.apiKey ?? "",
    fromEmail: provider?.fromEmail ?? "",
    fromName: provider?.fromName ?? "",
    smtpHost: provider?.smtpHost ?? "",
    smtpPort: provider?.smtpPort ?? "587",
    smtpUser: provider?.smtpUser ?? "",
    apiSecret: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(PROVIDERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", provider: providerVal, ...form, isActive: true }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1800);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30">
        <div className="flex items-center gap-3">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">EMAIL PROVIDER CONFIGURATION</span>
          {provider?.isActive && (
            <span className="font-mono text-[9px] text-purple-400 border border-purple-400/30 px-1.5 py-0.5">
              ◆ {EMAIL_PROVIDERS.find(p => p.value === provider.provider)?.label ?? provider.provider}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {saved && <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs p-2">✓ EMAIL PROVIDER SAVED</div>}
          <form onSubmit={save} className="space-y-3">
            <FieldSelect label="EMAIL PROVIDER" value={providerVal} onChange={e => setProviderVal(e.target.value)}>
              {EMAIL_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </FieldSelect>

            {(providerVal === "sendgrid" || providerVal === "ses") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldInput label="API KEY" required type="password" placeholder={providerVal === "sendgrid" ? "SG.xxxxxxxx..." : "AKIA..."} value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                </div>
                {providerVal === "ses" && (
                  <FieldInput label="AWS SECRET KEY" required type="password" placeholder="aws_secret_access_key" value={form.apiSecret} onChange={e => setForm(p => ({ ...p, apiSecret: e.target.value }))} />
                )}
                <FieldInput label="FROM EMAIL" required type="email" placeholder="campaign@kaloki2027.ke" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />
                <FieldInput label="FROM NAME" placeholder="Prof. Philip Kaloki Campaign" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />
              </div>
            )}

            {providerVal === "mailchimp" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldInput label="MANDRILL / MAILCHIMP API KEY" required type="password" placeholder="md-xxxxxxxxxxxxxxxxxxxxxxxx" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                </div>
                <FieldInput label="FROM EMAIL" required type="email" placeholder="campaign@kaloki2027.ke" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />
                <FieldInput label="FROM NAME" placeholder="Prof. Philip Kaloki Campaign" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />
              </div>
            )}

            {providerVal === "smtp" && (
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="SMTP HOST" required placeholder="smtp.gmail.com" value={form.smtpHost} onChange={e => setForm(p => ({ ...p, smtpHost: e.target.value }))} />
                <FieldInput label="PORT" required placeholder="587" value={form.smtpPort} onChange={e => setForm(p => ({ ...p, smtpPort: e.target.value }))} />
                <FieldInput label="SMTP USERNAME" required placeholder="campaign@kaloki2027.ke" value={form.smtpUser} onChange={e => setForm(p => ({ ...p, smtpUser: e.target.value }))} />
                <FieldInput label="SMTP PASSWORD" required type="password" placeholder="app_password_here" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />
                <FieldInput label="FROM EMAIL" required type="email" placeholder="campaign@kaloki2027.ke" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />
                <FieldInput label="FROM NAME" placeholder="Prof. Philip Kaloki Campaign" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-white font-mono text-[10px] tracking-widest px-4 py-2 hover:bg-primary/90 disabled:opacity-50">
                <Save className="w-3 h-3" /> {saving ? "SAVING..." : "SAVE EMAIL CONFIG"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Campaign panel ──────────────────────────────────────────────────────────
function CampaignPanel({ channel }: { channel: Channel }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<MessageCampaignInput>>({ channel });

  const { data: campaigns, isLoading } = useListCampaigns({ channel });
  const { data: segments } = useListSegments();
  const createCampaign = useCreateCampaign({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMessagingStatsQueryKey() });
        setShowAdd(false);
        setForm({ channel });
      },
    },
  });
  const deleteCampaign = useDeleteCampaign({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }) },
  });
  const sendCampaign = useSendCampaign({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMessagingStatsQueryKey() });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate({ data: form as MessageCampaignInput });
  };

  const channelLabel = channel === "sms" ? "SMS" : channel === "whatsapp" ? "WhatsApp" : "Email";
  const charLimit = channel === "sms" ? 160 : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] text-muted-foreground tracking-widest">◆ {channelLabel.toUpperCase()} CAMPAIGNS</div>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 bg-primary text-white font-mono text-[10px] tracking-widest px-3 py-2 hover:bg-primary/90">
          <Plus className="w-3 h-3" /> NEW {channelLabel.toUpperCase()} CAMPAIGN
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/40 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="font-mono text-[10px] tracking-widest">NEW {channelLabel.toUpperCase()} TRANSMISSION</div>
            <button onClick={() => { setShowAdd(false); setForm({ channel }); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <FieldInput label="CAMPAIGN NAME" required value={form.name ?? ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-muted-foreground tracking-widest">TARGET SEGMENT</label>
              <select value={form.segmentId ?? ""} onChange={e => setForm(p => ({ ...p, segmentId: e.target.value ? Number(e.target.value) : undefined }))} className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-none focus:border-primary">
                <option value="">ALL CONTACTS</option>
                {segments?.map(s => <option key={s.id} value={s.id}>{s.name} ({s.memberCount})</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-mono text-muted-foreground tracking-widest">MESSAGE BODY *</label>
                {charLimit && (
                  <span className={`font-mono text-[10px] ${(form.messageBody?.length ?? 0) > charLimit ? "text-red-400" : "text-muted-foreground"}`}>
                    {form.messageBody?.length ?? 0}/{charLimit}
                  </span>
                )}
              </div>
              <textarea
                required
                value={form.messageBody ?? ""}
                onChange={e => setForm(p => ({ ...p, messageBody: e.target.value }))}
                rows={channel === "email" ? 6 : 3}
                placeholder={channel === "email" ? "Email body (HTML supported)..." : channel === "whatsapp" ? "WhatsApp message (supports *bold*, _italic_, ~strikethrough~)..." : "SMS message (max 160 chars for 1 part)..."}
                className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <FieldInput label="SCHEDULE (OPTIONAL)" type="datetime-local" value={form.scheduledAt ?? ""} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
            <div className="flex items-end justify-end gap-2">
              <button type="button" onClick={() => { setShowAdd(false); setForm({ channel }); }} className="flex items-center gap-1.5 border border-border px-4 py-2 font-mono text-[10px] hover:bg-secondary">
                <X className="w-3 h-3" /> ABORT
              </button>
              <button type="submit" disabled={createCampaign.isPending} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 font-mono text-[10px] hover:bg-primary/90 disabled:opacity-50">
                <Check className="w-3 h-3" /> DEPLOY
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["NAME", "STATUS", "RECIPIENTS", "DELIVERED", "OPENED", "SCHEDULED", "ACTIONS"].map(h => (
                <th key={h} className="px-4 py-2 text-left font-mono text-[10px] text-muted-foreground tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground animate-pulse">LOADING TRANSMISSIONS...</td></tr>
            ) : !campaigns || campaigns.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">[ NO_{channel.toUpperCase()}_CAMPAIGNS ]</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-2.5 font-semibold">{c.name}</td>
                <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-2.5 font-mono">{c.recipientCount.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-green-400">{c.deliveredCount.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-blue-400">{c.openedCount.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                  {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    {c.status === "draft" && (
                      <button onClick={() => sendCampaign.mutate({ id: c.id })} title="Send now" className="text-muted-foreground hover:text-primary transition-colors">
                        <Send className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => { if (confirm("Delete campaign?")) deleteCampaign.mutate({ id: c.id }); }} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
const TABS: { id: Channel; label: string; color: string; desc: string }[] = [
  { id: "sms", label: "SMS", color: "text-blue-400 border-blue-400", desc: "Short message service — bulk SMS broadcast" },
  { id: "whatsapp", label: "WHATSAPP", color: "text-green-400 border-green-400", desc: "WhatsApp Business API messaging" },
  { id: "email", label: "EMAIL", color: "text-purple-400 border-purple-400", desc: "Email campaign management" },
];

export default function Messaging() {
  const [tab, setTab] = useState<Channel>("sms");
  const [providers, setProviders] = useState<Provider[]>([]);
  const { data: stats } = useGetMessagingStats();

  const loadProviders = useCallback(async () => {
    const res = await fetch(PROVIDERS_API);
    const data = await res.json();
    setProviders(data);
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const smsProvider = providers.find(p => p.channel === "sms");
  const waProvider = providers.find(p => p.channel === "whatsapp");
  const emailProvider = providers.find(p => p.channel === "email");

  const channelStats = stats?.byChannel.find(c => c.channel === tab);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            CAMPAIGN COMMUNICATIONS HUB
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest">
            PROF. PHILIP KALOKI 2027 · SMS · WHATSAPP · EMAIL
          </p>
        </div>

        {/* Global stats */}
        {stats && (
          <div className="flex gap-3">
            {[
              { label: "TOTAL SENT", value: stats.totalSent.toLocaleString(), color: "" },
              { label: "DELIVERED", value: stats.totalDelivered.toLocaleString(), color: "text-green-400" },
              { label: "DEL. RATE", value: `${(stats.deliveryRate * 100).toFixed(1)}%`, color: "text-green-400" },
              { label: "OPENED", value: stats.totalOpened.toLocaleString(), color: "text-blue-400" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border px-4 py-2 text-center min-w-[80px]">
                <div className="font-mono text-[9px] text-muted-foreground">{s.label}</div>
                <div className={`font-bold text-sm ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Channel tabs */}
      <div className="flex border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 font-mono text-[10px] tracking-widest border-b-2 transition-colors ${tab === t.id ? `${t.color} border-current` : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.id === "sms" && <Phone className="w-3 h-3" />}
            {t.id === "whatsapp" && <MessageSquare className="w-3 h-3" />}
            {t.id === "email" && <Mail className="w-3 h-3" />}
            {t.label}
            {/* Provider status dot */}
            {(t.id === "sms" ? smsProvider : t.id === "whatsapp" ? waProvider : emailProvider)?.isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1" />
            )}
          </button>
        ))}
      </div>

      {/* Per-channel stats */}
      {channelStats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "SENT", value: channelStats.sent.toLocaleString(), color: "" },
            { label: "DELIVERED", value: channelStats.delivered.toLocaleString(), color: "text-green-400" },
            { label: "OPEN RATE", value: `${(channelStats.openRate * 100).toFixed(1)}%`, color: "text-blue-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border p-3">
              <div className="font-mono text-[10px] text-muted-foreground">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Campaigns */}
      <CampaignPanel channel={tab} />

      {/* Provider config (channel-specific) */}
      {tab === "sms" && <SmsConfig provider={smsProvider} onSaved={loadProviders} />}
      {tab === "whatsapp" && <WhatsAppConfig provider={waProvider} onSaved={loadProviders} />}
      {tab === "email" && <EmailConfig provider={emailProvider} onSaved={loadProviders} />}
    </div>
  );
}