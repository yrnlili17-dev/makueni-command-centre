// Paths are relative to /api. Public access is an exact method/path allowlist.
export function isPublicApiRoute(method: string, path: string): boolean {
  const verb = method === "HEAD" ? "GET" : method;
  return [
    ["GET", /^\/healthz\/?$/],
    ["POST", /^\/volunteers\/register\/?$/],
    ["GET", /^\/surveys\/public\/polls\/\d+\/?$/],
    ["POST", /^\/surveys\/public\/participant-registration\/?$/],
    ["POST", /^\/surveys\/polls\/\d+\/vote\/?$/],
    ["GET", /^\/insights\/p\/[^/]+\/?$/],
    ["POST", /^\/insights\/p\/[^/]+\/(event|submit)\/?$/],
    ["GET", /^\/insights\/share\/[^/]+\/?$/],
    // Provider handlers remain responsible for verifying callback authenticity.
    ["POST", /^\/messages\/webhooks\/(twilio|africastalking)\/?$/],
    ["POST", /^\/fundraising\/mpesa\/callback\/?$/],
  ].some(([allowed, pattern]) => allowed === verb && (pattern as RegExp).test(path));
}

export const API_MODULES: Record<string, string> = {
  dashboard: "dashboard", members: "voters", segments: "segmentation",
  messages: "messaging", "field-ops": "field-ops", volunteers: "volunteers",
  surveys: "surveys", events: "events", intelligence: "narrative",
  "campaign-plan": "campaign-plan", kol: "kol", fundraising: "finance",
  "election-day": "election-day", turnout: "turnout", "voter-registry": "constituents",
  credentials: "credentials", admin: "admin", analytics: "analytics",
  insights: "insights", ai: "ai", speeches: "speeches", social: "social",
  di: "di", strategist: "strategist",
};

export function requiredApiAccess(method: string, path: string) {
  const module = API_MODULES[path.split("/")[1]];
  return { module, level: ["GET", "HEAD", "OPTIONS"].includes(method) ? "read" as const : "write" as const };
}
