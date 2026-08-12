// Shape of src/generated/reels-manifest.json, written by
// scripts/discover-reels.ts at build time. Root.tsx imports the JSON directly
// — it can never scan the filesystem at runtime — so everything a
// <Composition> registration needs (dimensions, fps, duration, branch key)
// must be here, copied verbatim from each package's sidecar. No probing.

export type ReelManifestEntry = {
  // Composition id == clip id == folder name.
  id: string;
  // staticFile()-relative package directory, e.g. "reels/reel-001".
  dir: string;
  kind: "reel" | "promo";
  captionSource: "authored" | "asr";
  title: string | null;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  direction: "rtl" | "ltr";
};

export type ReelsManifest = {
  schemaVersion: 1;
  // Absolute path of the scanned directory — informational only.
  sourceDir: string;
  reels: ReelManifestEntry[];
};
