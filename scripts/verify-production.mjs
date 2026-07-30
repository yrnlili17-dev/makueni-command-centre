import { spawnSync } from "node:child_process";
import fs from "node:fs";

const failures = [];

function run(label, command, args, env = {}) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) failures.push(label);
}

const forbidden = [".env", "api-build-error.txt"];
for (const file of forbidden) {
  if (fs.existsSync(file)) {
    failures.push(`Remove untracked sensitive/debug file: ${file}`);
  }
}

run(
  "API build",
  "pnpm",
  ["--filter", "@workspace/api-server", "build"],
);

run(
  "Frontend build",
  "pnpm",
  ["--filter", "@workspace/commandcentre", "build"],
  { PORT: "5174", BASE_PATH: "/" },
);

console.log("\n== Production verification result ==");
if (failures.length) {
  console.error("FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("All production checks passed.");
