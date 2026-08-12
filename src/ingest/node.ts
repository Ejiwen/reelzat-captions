// Node-side package loader — used by scripts/ and tests, never bundled into
// the composition (browser code imports ./resolve and ./useReelPackage only).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { batchIndexSchema, type BatchIndex } from "./schemas";
import { resolveReelPackage, type ReelPackage } from "./resolve";
import type { ReelManifestEntry } from "./manifest";

const readJsonIfExists = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw new Error(`Could not parse ${path}: ${(err as Error).message}`);
  }
};

// Loads one package folder from disk into a typed ReelPackage.
// `publicRelDir` is the staticFile()-relative dir, e.g. "reels/reel-001".
export const loadReelPackageFromDisk = (
  absDir: string,
  publicRelDir: string,
): ReelPackage => {
  const clipId = absDir.split("/").filter(Boolean).pop()!;
  const sidecar = readJsonIfExists(join(absDir, "remotion.json"));
  if (sidecar === undefined) {
    throw new Error(`Package "${clipId}" has no remotion.json sidecar (${absDir})`);
  }
  return resolveReelPackage({
    clipId,
    packageDir: publicRelDir,
    sidecar,
    authoring: readJsonIfExists(join(absDir, "authoring.json")),
    asrCaptions: readJsonIfExists(join(absDir, "captions.json")),
    words: readJsonIfExists(join(absDir, "words.json")),
    director: readJsonIfExists(join(absDir, "director.json")),
  });
};

export const toManifestEntry = (pkg: ReelPackage): ReelManifestEntry => ({
  id: pkg.clipId,
  dir: pkg.packageDir,
  kind: pkg.kind,
  captionSource: pkg.captionSource,
  title: pkg.title,
  width: pkg.media.width,
  height: pkg.media.height,
  fps: pkg.media.fps,
  durationInFrames: pkg.media.durationInFrames,
  direction: pkg.direction,
});

export type DiscoveredReels = {
  index: BatchIndex | null;
  // A malformed batch index is a warning, never a batch failure — the folder
  // scan is the source of truth for what renders.
  indexError: string | null;
  packages: ReelPackage[];
  // Package folders whose validation failed, with the full error report.
  failures: { clipId: string; error: string }[];
};

// Scans <reelsDir>/*/ for package folders (any directory containing a
// remotion.json sidecar). Validates the batch index when present. Sorted by
// clip id so output is deterministic.
export const discoverReels = (reelsDir: string): DiscoveredReels => {
  const packages: ReelPackage[] = [];
  const failures: { clipId: string; error: string }[] = [];

  let index: BatchIndex | null = null;
  let indexError: string | null = null;
  const rawIndex = readJsonIfExists(join(reelsDir, "remotion.json"));
  if (rawIndex !== undefined) {
    const parsed = batchIndexSchema.safeParse(rawIndex);
    if (parsed.success) {
      index = parsed.data;
    } else {
      indexError = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
    }
  }

  const entries = readdirSync(reelsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const name of entries) {
    const absDir = join(reelsDir, name);
    try {
      statSync(join(absDir, "remotion.json"));
    } catch {
      continue; // not a package folder
    }
    try {
      packages.push(loadReelPackageFromDisk(absDir, `reels/${name}`));
    } catch (err) {
      failures.push({ clipId: name, error: (err as Error).message });
    }
  }

  return { index, indexError, packages, failures };
};
