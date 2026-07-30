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
  if (!source.includes('from "./gis-intelligence"')) {
    const anchor = 'import authRouter from "./auth";';
    if (!source.includes(anchor)) {
      throw new Error("Could not locate API route import anchor.");
    }
    source = source.replace(
      anchor,
      `${anchor}\nimport gisIntelligenceRouter from "./gis-intelligence";`,
    );
  }

  if (!source.includes('router.use("/gis-intelligence"')) {
    const anchor = 'router.use("/auth", authRouter);';
    if (!source.includes(anchor)) {
      throw new Error("Could not locate API route registration anchor.");
    }
    source = source.replace(
      anchor,
      `${anchor}\nrouter.use("/gis-intelligence", gisIntelligenceRouter);`,
    );
  }

  return source;
});

patch("artifacts/commandcentre/src/App.tsx", (source) => {
  if (!source.includes('pages/gis-intelligence')) {
    const anchor = 'import Strategist from "@/pages/strategist";';
    if (!source.includes(anchor)) {
      throw new Error("Could not locate frontend import anchor.");
    }
    source = source.replace(
      anchor,
      `${anchor}\nimport GisIntelligencePage from "@/pages/gis-intelligence";`,
    );
  }

  if (!source.includes('<Route path="/gis-intelligence">')) {
    const anchor = '<Route path="/strategist">';
    if (!source.includes(anchor)) {
      throw new Error("Could not locate frontend route anchor.");
    }
    source = source.replace(
      anchor,
      `<Route path="/gis-intelligence">{() => <Guarded module="analytics" component={GisIntelligencePage} />}</Route>\n        ${anchor}`,
    );
  }

  return source;
});

patch("artifacts/commandcentre/src/components/layout.tsx", (source) => {
  if (!source.includes('label: "GIS INTELLIGENCE"')) {
    const possibleAnchors = [
      '{ href: "/gis-centre", label: "GIS CENTRE", icon: Map },',
      '{ href: "/analytics", label: "ANALYTICS", icon: BarChart3 },',
    ];
    const anchor = possibleAnchors.find((item) => source.includes(item));
    if (!anchor) {
      console.log("Navigation anchor not found; route still installed.");
      return source;
    }
    source = source.replace(
      anchor,
      `${anchor}\n      { href: "/gis-intelligence", label: "GIS INTELLIGENCE", icon: Map },`,
    );
  }

  if (
    source.includes("const PATH_MODULE") &&
    !source.includes('"/gis-intelligence": "analytics"')
  ) {
    const anchor = '"/analytics": "analytics",';
    if (source.includes(anchor)) {
      source = source.replace(
        anchor,
        `${anchor}\n  "/gis-intelligence": "analytics",`,
      );
    }
  }

  return source;
});

console.log("V2.0-B GIS and Campaign Intelligence integration complete.");
