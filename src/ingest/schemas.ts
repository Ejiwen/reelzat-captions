import { z } from "zod";
import { segmentSchema, wordTimingSchema } from "../schema/captions";

// Zod schemas for everything `reelzy export-reels` drops into public/reels/.
// These are the ONLY definitions of the upstream contract — the loader
// (resolve.ts) turns parsed files into one typed ReelPackage, and nothing
// outside src/ingest/ ever touches a raw package file.

// ---------------------------------------------------------------------------
// Shared primitives

export const overlayPositionSchema = z.enum(["top", "bottom"]);
export type OverlayPosition = z.infer<typeof overlayPositionSchema>;

export const textDirectionSchema = z.enum(["rtl", "ltr"]);
export type TextDirection = z.infer<typeof textDirectionSchema>;

// Display windows are clip-relative SECONDS (floats) — the only place seconds
// exist. resolve.ts converts them to frames exactly once.
export const displayWindowSchema = z.object({
  start: z
    .number()
    .nonnegative("display.start must be >= 0 (clip-relative seconds)"),
  end: z
    .number()
    .nonnegative("display.end must be >= 0 (clip-relative seconds)"),
});
export type DisplayWindow = z.infer<typeof displayWindowSchema>;

export const safeAreaSchema = z.object({
  // Hook band: top ~14% of the frame. Caption band: bottom ~20%.
  topPct: z.number().min(0).max(40).default(14),
  bottomPct: z.number().min(0).max(40).default(20),
  sidePct: z.number().min(0).max(20).default(7),
});
export type SafeArea = z.infer<typeof safeAreaSchema>;

export const defaultSafeArea: SafeArea = {
  topPct: 14,
  bottomPct: 20,
  sidePct: 7,
};

// ---------------------------------------------------------------------------
// authoring.json — video-watcher's curated overlay script

export const authoringSourceSchema = z.object({
  url: z.string().optional(),
  platform: z.string().optional(),
  videoId: z.string().optional(),
  episodeTitle: z.string().min(1, "source.episodeTitle must not be empty"),
  channel: z.string().min(1, "source.channel must not be empty"),
  language: z.string().default("ar"),
  direction: textDirectionSchema.default("rtl"),
});

export const authoredHookSchema = z.object({
  text: z.string().min(1, "hook text must not be empty"),
  position: overlayPositionSchema.default("top"),
  display: displayWindowSchema,
  // Optional editorial HookBg theme (politics/religion/culture/general/
  // social). Kept as a plain string here on purpose: an unknown value from a
  // newer or older emitter must degrade to the default theme downstream,
  // never fail the package. resolve.ts narrows it against the known list.
  backgroundTheme: z.string().optional(),
});

export const authoredWordSchema = z.object({
  text: z.string().min(1, "authored word text must not be empty"),
  in_reel: displayWindowSchema,
  in_source: displayWindowSchema,
});
export type AuthoredWord = z.infer<typeof authoredWordSchema>;

export const authoredCaptionSchema = z.object({
  type: z.enum(["short_1line", "long_2lines", "regular"]),
  lines: z
    .array(z.string().min(1, "caption line must not be empty"))
    .min(1, "caption must have at least one line"),
  position: overlayPositionSchema,
  display: displayWindowSchema,
  words: z
    .array(authoredWordSchema)
    .min(1, "words must not be empty")
    .optional(),
  verse: z.boolean().default(false),
  emphasis: z
    .array(z.string().min(1, "emphasis word must not be empty"))
    .max(2)
    .optional(),
});

export const authoringSchema = z.object({
  schemaVersion: z.literal(1),
  provenance: z.string().optional(),
  kind: z.enum(["reel", "promo"]),
  clipId: z.string().min(1),
  reelId: z.number().optional(),
  rank: z.number().optional(),
  title: z.string().optional(),
  // Opt-in because older packages keep the copyright rail fixed throughout;
  // enabled packages use the 13-second opening + 7-second closing timeline.
  nameplateAvoidance: z.boolean().default(false),
  source: authoringSourceSchema,
  hook: authoredHookSchema,
  captions: z.array(authoredCaptionSchema).default([]),
  publish: z
    .object({
      suggestedReelTitle: z.string().optional(),
      postText: z.string().optional(),
      hashtags: z.array(z.string()).default([]),
    })
    .optional(),
  whyItWorks: z.string().optional(),
  keyQuote: z.string().optional(),
  teaserReason: z.string().nullable().optional(),
});
export type Authoring = z.infer<typeof authoringSchema>;
export type AuthoredCaption = z.infer<typeof authoredCaptionSchema>;

// ---------------------------------------------------------------------------
// Per-clip remotion.json sidecar. Two dialects arrive here:
//
//  - the canonical v2 shape (ms-based words/captions, percent safeArea,
//    clipId/durationInSeconds) — what this schema describes, and
//  - the reelzy emitter's v1 shape (id/duration, seconds-based floats,
//    fraction safeArea {hookTopPct, captionBottomPct}, faces embedded in
//    framing segments).
//
// normalizeSidecar() folds the v1 dialect into the canonical one BEFORE
// parsing, so the rest of the codebase only ever sees one shape.

// Director framing segments and split geometry are consumed by reelzy when
// cutting; this stage only records them for debugging, so they stay opaque.
export const sidecarSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  clipId: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  durationInSeconds: z.number().positive(),
  aspect: z.string().optional(),
  language: z.string().default("ar"),
  direction: textDirectionSchema.default("rtl"),
  title: z.string().optional(),
  hook: z.string().nullable().optional(),
  // THE BRANCH KEY. v1 packages predate authoring and omit it — treat as asr.
  captionSource: z.enum(["authored", "asr"]).default("asr"),
  authoring: authoringSchema.nullable().default(null),
  words: z.array(wordTimingSchema).default([]),
  // ASR cues in the same shape as legacy captions.json segments.
  captions: z.array(segmentSchema).default([]),
  segments: z.array(z.unknown()).default([]),
  cuts: z.array(z.number().nonnegative()).default([]),
  safeArea: safeAreaSchema.default(defaultSafeArea),
  video: z.string().default("reel-9x16.mp4"),
  audio: z.string().nullable().default(null),
});
export type Sidecar = z.infer<typeof sidecarSchema>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// reelzy word timing: { text, start, end, srcStart?, probability? } in
// SECONDS (floats) → canonical { text, startMs, endMs }. Already-canonical
// entries pass through untouched.
export const normalizeWordTiming = (w: unknown): unknown => {
  if (
    !isRecord(w) ||
    typeof w["startMs"] === "number" ||
    typeof w["start"] !== "number" ||
    typeof w["end"] !== "number"
  ) {
    return w;
  }
  return {
    text: w["text"],
    startMs: Math.round(w["start"] * 1000),
    endMs: Math.round(w["end"] * 1000),
  };
};

// reelzy ASR cue: { start, end, text, words: [seconds…] } → canonical legacy
// segment { id, startMs, endMs, text, words }. Ids are generated (cue-001…)
// because the emitter writes none.
export const normalizeAsrCue = (cue: unknown, index: number): unknown => {
  if (
    !isRecord(cue) ||
    typeof cue["startMs"] === "number" ||
    typeof cue["start"] !== "number"
  ) {
    return cue;
  }
  return {
    id:
      typeof cue["id"] === "string"
        ? cue["id"]
        : `cue-${String(index + 1).padStart(3, "0")}`,
    startMs: Math.round((cue["start"] as number) * 1000),
    endMs: Math.round((cue["end"] as number) * 1000),
    text: cue["text"],
    words: Array.isArray(cue["words"])
      ? cue["words"].map(normalizeWordTiming)
      : [],
  };
};

// reelzy safe area: { hookTopPct: 0.14, captionBottomPct: 0.2 } — different
// keys AND 0–1 fractions. Canonical: { topPct, bottomPct, sidePct } in
// percent. Values below 1 are treated as fractions in either spelling.
const normalizeSafeArea = (sa: unknown): unknown => {
  if (!isRecord(sa)) {
    return sa;
  }
  const pct = (v: unknown, fallback: number): number =>
    typeof v === "number"
      ? v < 1
        ? Math.round(v * 10000) / 100
        : v
      : fallback;
  if ("hookTopPct" in sa || "captionBottomPct" in sa) {
    return {
      topPct: pct(sa["hookTopPct"], defaultSafeArea.topPct),
      bottomPct: pct(sa["captionBottomPct"], defaultSafeArea.bottomPct),
      sidePct: pct(sa["sidePct"], defaultSafeArea.sidePct),
    };
  }
  return {
    topPct: pct(sa["topPct"], defaultSafeArea.topPct),
    bottomPct: pct(sa["bottomPct"], defaultSafeArea.bottomPct),
    sidePct: pct(sa["sidePct"], defaultSafeArea.sidePct),
  };
};

// Folds the reelzy v1 dialect into the canonical sidecar shape. Idempotent —
// canonical input passes through unchanged.
export const normalizeSidecar = (data: unknown): unknown => {
  if (!isRecord(data)) {
    return data;
  }
  const obj: Record<string, unknown> = { ...data };
  if (obj["durationInSeconds"] == null && typeof obj["duration"] === "number") {
    obj["durationInSeconds"] = obj["duration"];
  }
  if (obj["clipId"] == null && typeof obj["id"] === "string") {
    obj["clipId"] = obj["id"];
  }
  if (obj["safeArea"] != null) {
    obj["safeArea"] = normalizeSafeArea(obj["safeArea"]);
  }
  if (Array.isArray(obj["words"])) {
    obj["words"] = obj["words"].map(normalizeWordTiming);
  }
  if (Array.isArray(obj["captions"])) {
    obj["captions"] = obj["captions"].map(normalizeAsrCue);
  }
  return obj;
};

// Face boxes from the sidecar's framing segments: reelzy writes them as
// CENTRE-anchored fractions of the frame ({ x: 0.5, y: 0.24, w: 0.55,
// h: 0.5 } — x−w/2 stays in bounds where a top-left reading would not).
// Converted to the canonical top-left percent rectangles used by the debug
// guides and never-cover-a-face checks.
export const facesFromSegments = (
  segments: unknown[],
): Array<
  DirectorZone & { startMs?: number; endMs?: number }
> => {
  const clamp = (v: number) =>
    Math.min(100, Math.max(0, Math.round(v * 100) / 100));
  const out: Array<
    DirectorZone & { startMs?: number; endMs?: number }
  > = [];
  for (const seg of segments) {
    if (!isRecord(seg) || !Array.isArray(seg["faces"])) {
      continue;
    }
    for (const face of seg["faces"]) {
      if (!isRecord(face)) {
        continue;
      }
      const { x, y, w, h } = face as Record<string, unknown>;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof w !== "number" ||
        typeof h !== "number"
      ) {
        continue;
      }
      out.push({
        xPct: clamp((x - w / 2) * 100),
        yPct: clamp((y - h / 2) * 100),
        wPct: clamp(w * 100),
        hPct: clamp(h * 100),
        ...(typeof seg["t0"] === "number"
          ? { startMs: Math.round(seg["t0"] * 1000) }
          : {}),
        ...(typeof seg["t1"] === "number"
          ? { endMs: Math.round(seg["t1"] * 1000) }
          : {}),
      });
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// words.json — ASR word timing (subtitle fallback). Accepts a bare array or
// a { words: [...] } wrapper, in either the canonical ms shape or the reelzy
// seconds shape.

export const wordsFileSchema = z.preprocess(
  (v) => {
    if (Array.isArray(v)) {
      return v.map(normalizeWordTiming);
    }
    if (isRecord(v) && Array.isArray(v["words"])) {
      return { words: v["words"].map(normalizeWordTiming) };
    }
    return v;
  },
  z
    .union([
      z.array(wordTimingSchema),
      z.object({ words: z.array(wordTimingSchema) }),
    ])
    .transform((v) => (Array.isArray(v) ? v : v.words)),
);

// ---------------------------------------------------------------------------
// director.json — face zones, text-safe zones, cut list, split geometry.
// All rectangles are percentages of the frame (0–100).

export const directorZoneSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  wPct: z.number().min(0).max(100),
  hPct: z.number().min(0).max(100),
});
export type DirectorZone = z.infer<typeof directorZoneSchema>;

export const directorSplitWindowSchema = z
  .object({
    startMs: z.number().nonnegative(),
    endMs: z.number().nonnegative(),
    centerYPct: z.number().min(0).max(100),
  })
  .refine((window) => window.endMs > window.startMs, {
    message: "split window endMs must be greater than startMs",
  });
export type DirectorSplitWindow = z.infer<typeof directorSplitWindowSchema>;

export const directorSchema = z.object({
  faces: z
    .array(
      directorZoneSchema.extend({
        startMs: z.number().nonnegative().optional(),
        endMs: z.number().nonnegative().optional(),
        estimated: z.boolean().optional(),
      }),
    )
    .default([]),
  textSafeZones: z
    .array(
      directorZoneSchema.extend({ position: overlayPositionSchema.optional() }),
    )
    .default([]),
  cuts: z.array(z.number().nonnegative()).default([]),
  split: z.unknown().optional(),
  // Canonical timed windows derived from splitScreen + its referenced
  // director segments. Only genuine full-width top/bottom splits enter here.
  splitWindows: z.array(directorSplitWindowSchema).default([]),
});
export type Director = z.infer<typeof directorSchema>;

// The real reelzy director.json is a full framing report: faces carry
// TOP-LEFT-anchored `boxNorm` fractions (unlike the sidecar's centre-anchored
// segment faces), plus anchors/avoid/safeZones whose semantics belong to the
// cutting stage. We normalise only what this stage consumes — face rectangles
// (debug guides, never-cover-a-face), cuts, split geometry — and drop face
// entries we cannot read rather than failing the package over debug data.
export const normalizeDirector = (data: unknown): unknown => {
  if (!isRecord(data)) {
    return data;
  }
  const obj: Record<string, unknown> = { ...data };
  const r = (v: number) => Math.round(v * 10000) / 100;
  if (Array.isArray(obj["faces"])) {
    obj["faces"] = obj["faces"]
      .map((f) => {
        if (!isRecord(f) || typeof f["xPct"] === "number") {
          return f;
        }
        const box = f["boxNorm"];
        if (
          isRecord(box) &&
          typeof box["x"] === "number" &&
          typeof box["y"] === "number" &&
          typeof box["w"] === "number" &&
          typeof box["h"] === "number"
        ) {
          return {
            xPct: r(box["x"]),
            yPct: r(box["y"]),
            wPct: r(box["w"]),
            hPct: r(box["h"]),
            ...(typeof f["t0"] === "number"
              ? { startMs: Math.round(f["t0"] * 1000) }
              : {}),
            ...(typeof f["t1"] === "number"
              ? { endMs: Math.round(f["t1"] * 1000) }
              : {}),
            ...(typeof f["estimated"] === "boolean"
              ? { estimated: f["estimated"] }
              : {}),
          };
        }
        return null;
      })
      .filter((f) => isRecord(f) && typeof f["xPct"] === "number");
  }
  if (Array.isArray(obj["cuts"])) {
    obj["cuts"] = obj["cuts"].filter((n) => typeof n === "number" && n >= 0);
  }
  if (obj["split"] == null && obj["splitScreen"] != null) {
    obj["split"] = obj["splitScreen"];
  }

  // reelzy describes split geometry once, then points at the timed entries in
  // director.segments by id. Fold that two-part representation into simple
  // windows before Zod strips fields this renderer does not otherwise use.
  const split = obj["split"];
  if (isRecord(split) && split["used"] === true) {
    const panels = Array.isArray(split["panels"])
      ? split["panels"].filter(isRecord)
      : [];
    const panelNorms = panels
      .map((panel) => {
        const output = panel["output"];
        return isRecord(output) && isRecord(output["norm"])
          ? output["norm"]
          : null;
      })
      .filter((norm): norm is Record<string, unknown> => norm !== null);
    const stackedPanelNorms = panelNorms
      .filter(
        (norm) =>
          typeof norm["x"] === "number" &&
          typeof norm["y"] === "number" &&
          typeof norm["w"] === "number" &&
          typeof norm["h"] === "number",
      )
      .sort((a, b) => (a["y"] as number) - (b["y"] as number));
    const topPanel = stackedPanelNorms[0];
    const bottomPanel = stackedPanelNorms[1];
    const isTopBottomHalf =
      stackedPanelNorms.length === 2 &&
      topPanel !== undefined &&
      bottomPanel !== undefined &&
      stackedPanelNorms.every(
        (norm) =>
          Math.abs(norm["x"] as number) <= 0.02 &&
          Math.abs((norm["w"] as number) - 1) <= 0.02 &&
          (norm["h"] as number) > 0.02,
      ) &&
      Math.abs(topPanel["y"] as number) <= 0.03 &&
      Math.abs(
        (topPanel["y"] as number) +
          (topPanel["h"] as number) -
          (bottomPanel["y"] as number),
      ) <= 0.03 &&
      Math.abs(
        (bottomPanel["y"] as number) + (bottomPanel["h"] as number) - 1,
      ) <= 0.03;

    if (isTopBottomHalf) {
      const divider = split["divider"];
      const dividerNorm = isRecord(divider) ? divider["norm"] : null;
      const dividerCenter =
        isRecord(dividerNorm) &&
        typeof dividerNorm["y"] === "number" &&
        typeof dividerNorm["h"] === "number"
          ? dividerNorm["y"] + dividerNorm["h"] / 2
          : 0.5;
      const wantedIds = new Set(
        Array.isArray(split["segments"])
          ? split["segments"].filter(
              (id): id is string => typeof id === "string",
            )
          : [],
      );
      const segments = Array.isArray(obj["segments"])
        ? obj["segments"].filter(isRecord)
        : [];
      obj["splitWindows"] = segments
        .filter((segment) =>
          wantedIds.size > 0
            ? typeof segment["id"] === "string" && wantedIds.has(segment["id"])
            : segment["mode"] === "two_person_split",
        )
        .filter(
          (segment) =>
            typeof segment["t0"] === "number" &&
            typeof segment["t1"] === "number" &&
            segment["t0"] >= 0 &&
            segment["t1"] > segment["t0"],
        )
        .map((segment) => ({
          startMs: Math.round((segment["t0"] as number) * 1000),
          endMs: Math.round((segment["t1"] as number) * 1000),
          centerYPct: Math.max(0, Math.min(100, r(dividerCenter))),
        }));
    }
  }
  return obj;
};

// ---------------------------------------------------------------------------
// Batch index — public/reels/remotion.json

export const batchIndexSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  mode: z.enum(["authored", "asr", "mixed"]).default("mixed"),
  source: z
    .object({
      channel: z.string().min(1),
      url: z.string().optional(),
      episodeTitle: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
  reels: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string().min(1),
          kind: z.enum(["reel", "promo"]).optional(),
          captionSource: z.enum(["authored", "asr"]).optional(),
        }),
      ]),
    )
    .default([]),
});
export type BatchIndex = z.infer<typeof batchIndexSchema>;
