import fs from "node:fs";

const patch = (file, fn) => {
  const original = fs.readFileSync(file, "utf8");
  const next = fn(original);
  if (next === original) console.log(`No change needed: ${file}`);
  else {
    fs.writeFileSync(file, next);
    console.log(`Patched: ${file}`);
  }
};

patch("lib/db/src/schema/index.ts", (s) =>
  s.includes('./final-release') ? s : `${s.trimEnd()}\nexport * from "./final-release";\n`
);

patch("artifacts/api-server/src/routes/index.ts", (s) => {
  if (!s.includes('from "./final-release"')) {
    const importAnchor = 'import authRouter from "./auth";';
    if (!s.includes(importAnchor)) throw new Error("API import anchor not found.");
    s = s.replace(importAnchor, `${importAnchor}\nimport finalReleaseRouter from "./final-release";`);
  }
  if (!s.includes('router.use("/final-release"')) {
    const routeAnchor = 'router.use("/auth", authRouter);';
    if (!s.includes(routeAnchor)) throw new Error("API route anchor not found.");
    s = s.replace(routeAnchor, `${routeAnchor}\nrouter.use("/final-release", finalReleaseRouter);`);
  }
  return s;
});

patch("artifacts/commandcentre/src/App.tsx", (s) => {
  if (!s.includes('pages/war-room')) {
    const anchor = 'import Strategist from "@/pages/strategist";';
    if (!s.includes(anchor)) throw new Error("App import anchor not found.");
    s = s.replace(anchor, `${anchor}\nimport WarRoom from "@/pages/war-room";\nimport ProductionCentre from "@/pages/production-centre";\nimport PublicCampaign from "@/pages/public-campaign";`);
  }
  if (!s.includes('<Route path="/war-room">')) {
    const anchor = '<Route path="/strategist">';
    const at = s.indexOf(anchor);
    if (at < 0) throw new Error("Protected route anchor not found.");
    s = `${s.slice(0, at)}<Route path="/war-room">{() => <Guarded module="election-day" component={WarRoom} />}</Route>\n        <Route path="/production-centre">{() => <Guarded module="admin" component={ProductionCentre} />}</Route>\n        ${s.slice(at)}`;
  }
  if (!s.includes('<Route path="/campaign" component={PublicCampaign}')) {
    const anchor = '<Route path="/login" component={Login} />';
    if (!s.includes(anchor)) throw new Error("Public route anchor not found.");
    s = s.replace(anchor, `${anchor}\n      <Route path="/campaign" component={PublicCampaign} />`);
  }
  return s;
});

patch("artifacts/commandcentre/src/components/layout.tsx", (s) => {
  if (!s.includes('label: "ELECTION WAR ROOM"')) {
    const anchor = '{ href: "/election-day", label: "ELECTION DAY OPS", icon: Vote },';
    if (!s.includes(anchor)) throw new Error("Election navigation anchor not found.");
    s = s.replace(anchor, `${anchor}\n      { href: "/war-room", label: "ELECTION WAR ROOM", icon: Vote },`);
  }
  if (!s.includes('label: "PRODUCTION CENTRE"')) {
    const anchor = '{ href: "/admin", label: "SYSTEM ADMIN", icon: Settings },';
    if (!s.includes(anchor)) throw new Error("Admin navigation anchor not found.");
    s = s.replace(anchor, `${anchor}\n      { href: "/production-centre", label: "PRODUCTION CENTRE", icon: Settings },`);
  }
  if (!s.includes('"/war-room": "election-day"')) {
    const anchor = '"/election-day": "election-day",';
    s = s.replace(anchor, `${anchor}\n  "/war-room": "election-day",`);
  }
  if (!s.includes('"/production-centre": "admin"')) {
    const anchor = '"/admin": "admin",';
    s = s.replace(anchor, `${anchor}\n  "/production-centre": "admin",`);
  }
  const pathSection = 'const PATH_MODULE: Record<string, string> = {';
  const pathAt = s.indexOf(pathSection);
  if (pathAt >= 0) {
    const before = s.slice(0, pathAt);
    let after = s.slice(pathAt);
    if (!after.includes('"/war-room": "war-room"')) {
      after = after.replace('"/election-day": "election-day",', '"/election-day": "election-day",\n  "/war-room": "war-room",');
    }
    if (!after.includes('"/production-centre": "production-centre"')) {
      after = after.replace('"/admin": "admin",', '"/admin": "admin",\n  "/production-centre": "production-centre",');
    }
    s = before + after;
  }
  return s;
});

console.log("Phase 11-13 integration complete.");
