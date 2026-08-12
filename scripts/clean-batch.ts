// Removes the current batch and rendered outputs while leaving source code,
// fixtures and dependencies untouched. The marker prevents discovery from
// re-seeding demo fixtures before the next real batch is imported.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ReelsManifest } from "../src/ingest/manifest";

const projectRoot = resolve(__dirname, "..");
const reelsDir = join(projectRoot, "public", "reels");
const outDir = join(projectRoot, "out");
const manifestPath = join(projectRoot, "src", "generated", "reels-manifest.json");
const skipFixtureSeedPath = join(reelsDir, ".skip-fixture-seed");

const emptyDirectory = (dir: string): void => {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
};

emptyDirectory(reelsDir);
emptyDirectory(outDir);

writeFileSync(
  skipFixtureSeedPath,
  "Created by npm run clean:batch; prevents automatic fixture seeding.\n",
);

const manifest: ReelsManifest = {
  schemaVersion: 1,
  sourceDir: "public/reels",
  reels: [],
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log("[clean-batch] cleared public/reels and out");
console.log("[clean-batch] reset src/generated/reels-manifest.json");
console.log("[clean-batch] ready for a new batch; fixtures will not be seeded automatically");
