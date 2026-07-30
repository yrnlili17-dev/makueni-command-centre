import fs from "node:fs";

function patch(file, transform) {
  const current = fs.readFileSync(file, "utf8");
  const next = transform(current);
  if (next === current) {
    console.log(`No change required: ${file}`);
    return;
  }
  fs.writeFileSync(file, next);
  console.log(`Patched: ${file}`);
}

patch("artifacts/api-server/src/routes/index.ts", (source) => {
  if (!source.includes('from "./production-readiness"')) {
    const anchors = [
      'import electionWarRoomRouter from "./election-war-room";',
      'import authRouter from "./auth";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate API import anchor.");
    source = source.replace(
      anchor,
      `${anchor}\nimport productionReadinessRouter from "./production-readiness";`,
    );
  }

  if (!source.includes('router.use("/production-readiness"')) {
    const anchors = [
      'router.use("/election-war-room", electionWarRoomRouter);',
      'router.use("/auth", authRouter);',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate API registration anchor.");
    source = source.replace(
      anchor,
      `${anchor}\nrouter.use("/production-readiness", productionReadinessRouter);`,
    );
  }
  return source;
});

patch("artifacts/commandcentre/src/App.tsx", (source) => {
  if (!source.includes('pages/production-readiness')) {
    const anchors = [
      'import ElectionWarRoomPage from "@/pages/election-war-room";',
      'import Strategist from "@/pages/strategist";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate frontend import anchor.");
    source = source.replace(
      anchor,
      `${anchor}\nimport ProductionReadinessPage from "@/pages/production-readiness";`,
    );
  }

  if (!source.includes('<Route path="/production-readiness">')) {
    const anchors = [
      '<Route path="/election-war-room">',
      '<Route path="/strategist">',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate frontend route anchor.");
    source = source.replace(
      anchor,
      `<Route path="/production-readiness">{() => <Guarded module="admin" component={ProductionReadinessPage} />}</Route>\n        ${anchor}`,
    );
  }
  return source;
});

patch("artifacts/commandcentre/src/components/layout.tsx", (source) => {
  if (!source.includes('label: "PRODUCTION READINESS"')) {
    const anchors = [
      '{ href: "/election-war-room", label: "ELECTION WAR ROOM", icon: Vote },',
      '{ href: "/admin", label: "ADMIN", icon: Settings },',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (anchor) {
      source = source.replace(
        anchor,
        `${anchor}\n      { href: "/production-readiness", label: "PRODUCTION READINESS", icon: ShieldCheck },`,
      );
    } else {
      console.log("Navigation anchor not found; route is still installed.");
    }
  }

  if (
    source.includes("const PATH_MODULE") &&
    !source.includes('"/production-readiness": "admin"')
  ) {
    const anchors = ['"/admin": "admin",', '"/election-war-room": "election-day",'];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (anchor) {
      source = source.replace(
        anchor,
        `${anchor}\n  "/production-readiness": "admin",`,
      );
    }
  }
  return source;
});

console.log("V2.0-D production hardening installed.");
console.log("Run: node scripts/verify-production.mjs");
