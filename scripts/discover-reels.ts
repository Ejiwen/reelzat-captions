// Build-time discovery: scans public/reels/*/ and writes
// src/generated/reels-manifest.json so Root.tsx can register one composition
// per reel without touching the filesystem at runtime. Wired as an npm
// pre-script for studio and render:batch.
//
// When public/reels/ has no packages (fresh clone), it seeds from
// fixtures/reels/ so the project — like the legacy captions burner — runs
// immediately.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { discoverReels, toManifestEntry } from "../src/ingest/node";
import type { ReelsManifest } from "../src/ingest/manifest";

const projectRoot = resolve(__dirname, "..");
const reelsDir = join(projectRoot, "public", "reels");
const fixturesDir = join(projectRoot, "fixtures", "reels");
const manifestPath = join(projectRoot, "src", "generated", "reels-manifest.json");
const skipFixtureSeedPath = join(reelsDir, ".skip-fixture-seed");

const hasPackages = (dir: string): boolean =>
  existsSync(dir) &&
  readdirSync(dir, { withFileTypes: true }).some(
    (e) => e.isDirectory() && existsSync(join(dir, e.name, "remotion.json")),
  );

if (!hasPackages(reelsDir) && !existsSync(skipFixtureSeedPath) && hasPackages(fixturesDir)) {
  console.log(`[discover-reels] public/reels is empty — seeding from fixtures/reels`);
  mkdirSync(reelsDir, { recursive: true });
  cpSync(fixturesDir, reelsDir, { recursive: true });
}

const manifest: ReelsManifest = { schemaVersion: 1, sourceDir: "public/reels", reels: [] };

if (hasPackages(reelsDir)) {
  const { packages, failures, indexError } = discoverReels(reelsDir);
  manifest.reels = packages.map(toManifestEntry);

  if (indexError) {
    console.warn(`[discover-reels] batch index invalid (ignored): ${indexError}`);
  }
  for (const failure of failures) {
    console.error(`\n[discover-reels] SKIPPING ${failure.clipId}:\n${failure.error}\n`);
  }
  if (failures.length > 0 && packages.length === 0) {
    console.error(`[discover-reels] every package failed validation — aborting`);
    process.exit(1);
  }
} else {
  console.warn(`[discover-reels] no packages found in public/reels — manifest will be empty`);
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `[discover-reels] wrote ${manifest.reels.length} reel${manifest.reels.length === 1 ? "" : "s"} to src/generated/reels-manifest.json` +
    (manifest.reels.length > 0 ? `: ${manifest.reels.map((r) => r.id).join(", ")}` : ""),
);
