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
  if (!source.includes('from "./election-war-room"')) {
    const anchors = [
      'import authRouter from "./auth";',
      'import gisIntelligenceRouter from "./gis-intelligence";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate API route import anchor.");
    source = source.replace(
      anchor,
      `${anchor}\nimport electionWarRoomRouter from "./election-war-room";`,
    );
  }

  if (!source.includes('router.use("/election-war-room"')) {
    const anchors = [
      'router.use("/auth", authRouter);',
      'router.use("/gis-intelligence", gisIntelligenceRouter);',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate API route registration anchor.");
    source = source.replace(
      anchor,
      `${anchor}\nrouter.use("/election-war-room", electionWarRoomRouter);`,
    );
  }

  return source;
});

patch("artifacts/commandcentre/src/App.tsx", (source) => {
  if (!source.includes('pages/election-war-room')) {
    const anchors = [
      'import GisIntelligencePage from "@/pages/gis-intelligence";',
      'import Strategist from "@/pages/strategist";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate frontend import anchor.");
    source = source.replace(
      anchor,
      `${anchor}\nimport ElectionWarRoomPage from "@/pages/election-war-room";`,
    );
  }

  if (!source.includes('<Route path="/election-war-room">')) {
    const anchors = [
      '<Route path="/gis-intelligence">',
      '<Route path="/strategist">',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("Could not locate frontend route anchor.");
    source = source.replace(
      anchor,
      `<Route path="/election-war-room">{() => <Guarded module="election-day" component={ElectionWarRoomPage} />}</Route>\n        ${anchor}`,
    );
  }

  return source;
});

patch("artifacts/commandcentre/src/components/layout.tsx", (source) => {
  if (!source.includes('label: "ELECTION WAR ROOM"')) {
    const anchors = [
      '{ href: "/gis-intelligence", label: "GIS INTELLIGENCE", icon: Map },',
      '{ href: "/election-day", label: "ELECTION DAY", icon: Vote },',
      '{ href: "/analytics", label: "ANALYTICS", icon: BarChart3 },',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) {
      console.log("Navigation anchor not found; route is still installed.");
      return source;
    }
    source = source.replace(
      anchor,
      `${anchor}\n      { href: "/election-war-room", label: "ELECTION WAR ROOM", icon: Vote },`,
    );
  }

  if (
    source.includes("const PATH_MODULE") &&
    !source.includes('"/election-war-room": "election-day"')
  ) {
    const anchors = [
      '"/election-day": "election-day",',
      '"/gis-intelligence": "analytics",',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (anchor) {
      source = source.replace(
        anchor,
        `${anchor}\n  "/election-war-room": "election-day",`,
      );
    }
  }

  return source;
});

console.log("V2.0-C Election War Room foundation installed.");
console.log("No database migration or fragile table import was added.");
