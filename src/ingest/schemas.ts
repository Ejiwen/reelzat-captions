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
  start: z.number().nonnegative("display.start must be >= 0 (clip-relative seconds)"),
  end: z.number().nonnegative("display.end must be >= 0 (clip-relative seconds)"),
});
export type DisplayWindow = z.infer<typeof displayWindowSchema>;

export const safeAreaSchema = z.object({
  // Hook band: top ~14% of the frame. Caption band: bottom ~20%.
  topPct: z.number().min(0).max(40).default(14),
  bottomPct: z.number().min(0).max(40).default(20),
  sidePct: z.number().min(0).max(20).default(7),
});
export type SafeArea = z.infer<typeof safeAreaSchema>;

export const defaultSafeArea: SafeArea = { topPct: 14, bottomPct: 20, sidePct: 7 };

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
});

export const authoredCaptionSchema = z.object({
  type: z.enum(["short_1line", "long_2lines"]),
  lines: z
    .array(z.string().min(1, "caption line must not be empty"))
    .min(1, "caption must have at least one line")
    .max(2, "caption must have at most two lines"),
  position: overlayPositionSchema,
  display: displayWindowSchema,
});

export const authoringSchema = z.object({
  schemaVersion: z.literal(1),
  provenance: z.string().optional(),
  kind: z.enum(["reel", "promo"]),
  clipId: z.string().min(1),
  reelId: z.number().optional(),
  rank: z.number().optional(),
  title: z.string().optional(),
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
// Per-clip remotion.json sidecar (schemaVersion 2)

// Director framing segments and split geometry are consumed by reelzy when
// cutting; this stage only records them for debugging, so they stay opaque.
export const sidecarSchema = z.object({
  schemaVersion: z.literal(2),
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

// Some emitters write `duration` instead of `durationInSeconds`. Normalise
// before parsing so the schema stays canonical.
export const normalizeSidecar = (data: unknown): unknown => {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (obj["durationInSeconds"] == null && typeof obj["duration"] === "number") {
      return { ...obj, durationInSeconds: obj["duration"] };
    }
  }
  return data;
};

// ---------------------------------------------------------------------------
// words.json — ASR word timing (subtitle fallback). Accepts a bare array or
// a { words: [...] } wrapper.

export const wordsFileSchema = z
  .union([z.array(wordTimingSchema), z.object({ words: z.array(wordTimingSchema) })])
  .transform((v) => (Array.isArray(v) ? v : v.words));

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

export const directorSchema = z.object({
  faces: z
    .array(
      directorZoneSchema.extend({
        startMs: z.number().nonnegative().optional(),
        endMs: z.number().nonnegative().optional(),
      }),
    )
    .default([]),
  textSafeZones: z
    .array(directorZoneSchema.extend({ position: overlayPositionSchema.optional() }))
    .default([]),
  cuts: z.array(z.number().nonnegative()).default([]),
  split: z.unknown().optional(),
});
export type Director = z.infer<typeof directorSchema>;

// ---------------------------------------------------------------------------
// Batch index — public/reels/remotion.json

export const batchIndexSchema = z.object({
  schemaVersion: z.literal(2),
  mode: z.enum(["authored", "asr", "mixed"]),
  source: z.object({
    channel: z.string().min(1),
    url: z.string().optional(),
    episodeTitle: z.string().optional(),
    language: z.string().optional(),
  }),
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
