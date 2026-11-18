// Builds the Android app's web files: a static export of the site in
// "standalone" mode (AI calls go straight from the phone with the user's keys),
// written to ./out for Capacitor to package.
//
// Static export can't include the server API routes, so app/api is moved into a
// private folder (Next.js ignores folders starting with "_") during the build.
import { spawnSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

const api = "app/api";
const parked = "app/_api_server_only";

if (existsSync(parked)) {
  console.error(`${parked} exists — a previous build was interrupted. Move it back to ${api} first.`);
  process.exit(1);
}

rmSync("out", { recursive: true, force: true });
renameSync(api, parked);
let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "mobile", NEXT_PUBLIC_APP_MODE: "standalone" },
  });
  status = result.status ?? 1;
} finally {
  renameSync(parked, api);
}
process.exit(status);
