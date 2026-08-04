#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const layoutPath = path.join(cwd, "artifacts/commandcentre/src/components/layout.tsx");
const aiPath = path.join(cwd, "artifacts/commandcentre/src/components/ai-assist-panel.tsx");
const cssCandidates = [
  path.join(cwd, "artifacts/commandcentre/src/index.css"),
  path.join(cwd, "artifacts/commandcentre/src/globals.css"),
  path.join(cwd, "artifacts/commandcentre/src/styles.css"),
];
const cssPath = cssCandidates.find(fs.existsSync);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase13a-combined-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}
function replaceOnce(text, oldValue, newValue, label) {
  if (!text.includes(oldValue)) fail(`Anchor not found: ${label}`);
  return text.replace(oldValue, newValue);
}

if (!fs.existsSync(layoutPath)) fail(`Missing ${layoutPath}`);
if (!fs.existsSync(aiPath)) fail(`Missing ${aiPath}`);
if (!cssPath) fail("Could not locate global CSS file.");

let layout = fs.readFileSync(layoutPath, "utf8");
let ai = fs.readFileSync(aiPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

if (layout.includes("makueni-command-centre-open-nav-group")) {
  fail("Phase 13A is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(layoutPath, path.join(backupDir, "layout.tsx"));
fs.copyFileSync(aiPath, path.join(backupDir, "ai-assist-panel.tsx"));
fs.copyFileSync(cssPath, path.join(backupDir, path.basename(cssPath)));

layout = replaceOnce(
  layout,
  'import React, { useEffect, useState } from "react";',
  'import React, { useEffect, useMemo, useState } from "react";',
  "React useMemo import",
);

layout = replaceOnce(
  layout,
  'BrainCircuit, FolderLock, Menu, X, Home, Bell, MoreHorizontal',
  'BrainCircuit, FolderLock, Menu, X, Home, Bell, MoreHorizontal, ChevronDown, Activity',
  "Lucide responsive icons",
);

layout = replaceOnce(
  layout,
  '      { href: "/war-room", label: "ELECTION WAR ROOM", icon: Vote },\n    { href: "/turnout", label: "TURNOUT FORECAST", icon: TrendingUp },',
  '    { href: "/war-room", label: "ELECTION WAR ROOM", icon: Vote },\n    { href: "/election-war-room", label: "RESULTS COMMAND CENTRE", icon: Activity },\n    { href: "/turnout", label: "TURNOUT & GOTV", icon: TrendingUp },',
  "Election navigation entries",
);

layout = replaceOnce(
  layout,
  '  { href: "/operations-hub", label: "Operations", icon: ClipboardList },',
  '  { href: "/operations-hub", label: "Ops", icon: ClipboardList },',
  "Compact Ops label",
);

layout = replaceOnce(
  layout,
  'const mobileNav = [',
  'const NAV_GROUP_STORAGE_KEY = "makueni-command-centre-open-nav-group";\n\nconst mobileNav = [',
  "Navigation storage key",
);

layout = replaceOnce(
  layout,
  '  const [notificationsOpen, setNotificationsOpen] = useState(false);\n  const { user, can, logout } = useAuth();',
  `  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(() => {
    if (typeof window === "undefined") return "COMMAND";
    return window.localStorage.getItem(NAV_GROUP_STORAGE_KEY) ?? "COMMAND";
  });
  const { user, can, logout } = useAuth();`,
  "Accordion state",
);

layout = replaceOnce(
  layout,
  `  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => NAV_PERM[item.href] ? can(NAV_PERM[item.href]) : true),
  })).filter(group => group.items.length > 0);`,
  `  const visibleGroups = useMemo(() => navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => NAV_PERM[item.href] ? can(NAV_PERM[item.href]) : true),
  })).filter(group => group.items.length > 0), [can]);

  const activeGroupTitle = useMemo(
    () => visibleGroups.find(group =>
      group.items.some(item => item.href === location)
    )?.title ?? visibleGroups[0]?.title ?? "COMMAND",
    [location, visibleGroups],
  );

  useEffect(() => {
    setOpenGroup(activeGroupTitle);
    window.localStorage.setItem(NAV_GROUP_STORAGE_KEY, activeGroupTitle);
  }, [activeGroupTitle]);

  const toggleGroup = (title: string) => {
    setOpenGroup(current => {
      const next = current === title ? "" : title;
      window.localStorage.setItem(NAV_GROUP_STORAGE_KEY, next);
      return next;
    });
  };`,
  "Visible groups and accordion behavior",
);

const oldGroups = `          {visibleGroups.map(group => (
            <div key={group.title}>
              <div className="mb-1.5 flex items-center gap-2 border-l-2 border-primary bg-secondary/60 px-3 py-1.5">
                <span className="font-mono text-[10px] font-bold text-primary">▸</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">{group.title}</span>
              </div>
              <ul className="space-y-1">
                {group.items.map(item => {
                  const active = location === item.href;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={cn(
                        "flex min-h-11 items-center gap-3 border-l-2 px-3 py-2 font-mono text-xs tracking-wider transition-colors",
                        active ? "border-primary-foreground bg-primary text-primary-foreground" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}>
                        <item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}`;

const newGroups = `          {visibleGroups.map(group => {
            const expanded = openGroup === group.title;
            const containsActive = group.items.some(item => location === item.href);
            return (
              <section key={group.title} className="overflow-hidden border border-border/70 bg-background/20">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary",
                    containsActive && "bg-secondary/80",
                  )}
                  aria-expanded={expanded}
                >
                  <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                    {group.title}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
                    expanded && "rotate-180",
                  )} />
                </button>
                <div className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200",
                  expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60",
                )}>
                  <div className="overflow-hidden">
                    <ul className="space-y-1 border-t border-border/70 p-1.5">
                      {group.items.map(item => {
                        const active = location === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                "flex min-h-10 items-center gap-3 border-l-2 px-3 py-2 font-mono text-[11px] tracking-wide transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}`;

layout = replaceOnce(layout, oldGroups, newGroups, "Sidebar groups");

layout = replaceOnce(
  layout,
  '<div className="space-y-4 px-2">',
  '<div className="space-y-1.5 px-2">',
  "Compact group spacing",
);

layout = replaceOnce(
  layout,
  'className="responsive-content flex-1 overflow-x-hidden px-3 py-4 pb-28 sm:px-5 lg:overflow-y-auto lg:p-6 lg:pb-24"',
  'className="responsive-content flex-1 overflow-x-hidden px-3 py-3 pb-24 sm:px-5 sm:py-4 lg:overflow-y-auto lg:p-6 lg:pb-24 2xl:px-8"',
  "Responsive content padding",
);

layout = replaceOnce(
  layout,
  '<nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Quick navigation">',
  '<nav className="mobile-bottom-nav fixed inset-x-2 z-50 grid h-[58px] grid-cols-5 overflow-hidden rounded-xl border border-border bg-card/95 px-1 shadow-2xl backdrop-blur lg:hidden" style={{ bottom: "max(.5rem, env(safe-area-inset-bottom))" }} aria-label="Quick navigation">',
  "Compact mobile nav container",
);

layout = replaceOnce(
  layout,
  'className={cn("flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px]", active ? "text-primary" : "text-muted-foreground")}',
  'className={cn("flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[9px]", active ? "text-primary" : "text-muted-foreground")}',
  "Compact mobile nav links",
);

layout = layout.replace(
  '<item.icon className="h-5 w-5" /><span>{item.label}</span>',
  '<item.icon className="h-4 w-4" /><span className="w-full truncate text-center">{item.label}</span>',
);

layout = replaceOnce(
  layout,
  'className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted-foreground"',
  'className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[9px] text-muted-foreground"',
  "Compact Menu button",
);
layout = layout.replace(
  '<MoreHorizontal className="h-5 w-5" /><span>More</span>',
  '<MoreHorizontal className="h-4 w-4" /><span>Menu</span>',
);

ai = ai.replace(
  '"bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3"',
  '"bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3"',
);
ai = ai.replace(
  '"inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"',
  '"inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"',
);

const cssMarker = "/* Phase 13A — Global responsive command-centre UX */";
if (!css.includes(cssMarker)) {
  css += `
${cssMarker}
@media (max-width: 767px) {
  .responsive-content { width: 100%; max-width: 100vw; }
  .responsive-content > * { min-width: 0; }
  .responsive-content table { white-space: nowrap; }
  .responsive-content :where(.grid) { min-width: 0; }
  .responsive-content :where(button, a, input, select, textarea) { max-width: 100%; }
}
@media (min-width: 1920px) {
  .responsive-content { max-width: 2200px; width: 100%; margin-inline: auto; }
}
@media (min-width: 2560px) {
  .responsive-content { max-width: 2800px; }
}
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .responsive-content { padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)); }
  @media (min-width: 1024px) {
    .responsive-content { padding-bottom: 6rem; }
  }
}
`;
}

fs.writeFileSync(layoutPath, layout);
fs.writeFileSync(aiPath, ai);
fs.writeFileSync(cssPath, css);

const checks = [
  layout.includes("makueni-command-centre-open-nav-group"),
  layout.includes("ChevronDown"),
  layout.includes("grid-rows-[1fr]"),
  layout.includes("h-[58px]"),
  layout.includes("RESULTS COMMAND CENTRE"),
  ai.includes("bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"),
  css.includes(cssMarker),
];

if (checks.some(check => !check)) {
  fs.copyFileSync(path.join(backupDir, "layout.tsx"), layoutPath);
  fs.copyFileSync(path.join(backupDir, "ai-assist-panel.tsx"), aiPath);
  fs.copyFileSync(path.join(backupDir, path.basename(cssPath)), cssPath);
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 13A combined responsive UX installed.

Modified:
  ${layoutPath}
  ${aiPath}
  ${cssPath}

Backup:
  ${backupDir}

Delivered:
  - Mobile accordion navigation
  - One open section at a time
  - Active section auto-expansion
  - Remembered section selection
  - Compact 58px bottom navigation
  - Smart Assist mobile-safe placement
  - Results Command Centre menu entry
  - Mobile/tablet/desktop/ultrawide safeguards

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
