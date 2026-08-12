import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { discoverReels, loadReelPackageFromDisk } from "../src/ingest/node";
import { resolveReelPackage, secondsToFrames } from "../src/ingest/resolve";
import {
  captionBottomOffsetAboveProgressPx,
  facebookSafeRegionBottomPct,
  facebookSafeRegionBottomPx,
  facebookSafeRegionTopPct,
  facebookSafeRegionTopPx,
  normalizedReelProgress,
} from "../src/overlays/ProgressBar/math";

const fixturesDir = join(__dirname, "..", "fixtures", "reels");

// ---------------------------------------------------------------------------
// Progress bar geometry

test("progress is exact at the first, middle, and final renderable frames", () => {
  assert.equal(normalizedReelProgress(0, 101), 0);
  assert.equal(normalizedReelProgress(50, 101), 0.5);
  assert.equal(normalizedReelProgress(100, 101), 1);
  assert.equal(normalizedReelProgress(-5, 101), 0);
  assert.equal(normalizedReelProgress(105, 101), 1);
  assert.equal(normalizedReelProgress(0, 1), 1);
});

test("Facebook 4:5 safe-region boundaries scale with the composition", () => {
  assert.equal(facebookSafeRegionTopPx(1080, 1920, 4 / 5), 285);
  assert.equal(facebookSafeRegionTopPct(1080, 1920, 4 / 5), 14.84375);
  assert.equal(facebookSafeRegionTopPx(540, 960, 4 / 5), 142.5);
  assert.equal(facebookSafeRegionBottomPx(1080, 1920, 4 / 5), 1635);
  assert.equal(facebookSafeRegionBottomPct(1080, 1920, 4 / 5), 85.15625);
  assert.equal(
    captionBottomOffsetAboveProgressPx({
      width: 1080,
      height: 1920,
      safeAspectRatio: 4 / 5,
      safeAreaInsetPx: 12,
      ringSizePx: 152,
      clearancePx: 52,
    }),
    425,
  );
});

// ---------------------------------------------------------------------------
// Building blocks

const validSidecar = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 2,
  clipId: "reel-x",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 22,
  language: "ar",
  direction: "rtl",
  captionSource: "authored",
  authoring: null,
  words: [],
  captions: [],
  segments: [],
  cuts: [],
  safeArea: { topPct: 14, bottomPct: 20, sidePct: 7 },
  ...overrides,
});

const validAuthoring = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  provenance: "video-watcher",
  kind: "reel",
  clipId: "reel-x",
  title: "عنوان",
  source: {
    episodeTitle: "حلقة",
    channel: "قناة",
    language: "ar",
    direction: "rtl",
  },
  hook: { text: "خطاف قوي", position: "top", display: { start: 0, end: 3 } },
  captions: [
    {
      type: "short_1line",
      lines: ["سطر واحد قصير"],
      position: "top",
      display: { start: 12, end: 15 },
    },
  ],
  ...overrides,
});

const asrCaptions = {
  version: 1,
  language: "ar",
  segments: [
    {
      id: "seg-001",
      startMs: 0,
      endMs: 1000,
      text: "كلمة أولى",
      words: [
        { text: "كلمة", startMs: 0, endMs: 500 },
        { text: "أولى", startMs: 500, endMs: 1000 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Seconds → frames (the one conversion point)

test("secondsToFrames: 26.72 s @ 30 fps → 801 frames", () => {
  assert.equal(secondsToFrames(26.72, 30), 801);
});

test("authored display windows convert to frames exactly once, at ingest", () => {
  const pkg = resolveReelPackage({
    clipId: "reel-x",
    packageDir: "reels/reel-x",
    sidecar: validSidecar({ durationInSeconds: 26.72 }),
    authoring: validAuthoring(),
  });
  assert.equal(pkg.media.durationInFrames, 801);
  assert.deepEqual(pkg.authored?.hook.window, { startFrame: 0, endFrame: 90 });
  assert.deepEqual(pkg.authored?.captions[0]?.window, { startFrame: 360, endFrame: 450 });
});

// ---------------------------------------------------------------------------
// Discriminator

test("missing captionSource defaults to asr (v1 packages)", () => {
  const sidecar = validSidecar({ captionSource: undefined, authoring: undefined });
  delete (sidecar as Record<string, unknown>)["captionSource"];
  delete (sidecar as Record<string, unknown>)["authoring"];
  const pkg = resolveReelPackage({
    clipId: "reel-x",
    packageDir: "reels/reel-x",
    sidecar,
    asrCaptions,
  });
  assert.equal(pkg.captionSource, "asr");
  assert.equal(pkg.authored, null);
  assert.equal(pkg.asr.captions?.segments.length, 1);
});

test("captionSource authored without authoring data is rejected", () => {
  assert.throws(
    () =>
      resolveReelPackage({
        clipId: "reel-x",
        packageDir: "reels/reel-x",
        sidecar: validSidecar(),
      }),
    /captionSource is "authored" but neither/,
  );
});

// ---------------------------------------------------------------------------
// Semantic guarantees, validated defensively

test("a promo with captions is rejected", () => {
  assert.throws(
    () =>
      resolveReelPackage({
        clipId: "reel-x",
        packageDir: "reels/reel-x",
        sidecar: validSidecar(),
        authoring: validAuthoring({ kind: "promo" }),
      }),
    /a promo must have zero captions — received 1/,
  );
});

test("same-position overlaps and out-of-clip windows are rejected", () => {
  assert.throws(
    () =>
      resolveReelPackage({
        clipId: "reel-x",
        packageDir: "reels/reel-x",
        sidecar: validSidecar({ durationInSeconds: 14 }),
        authoring: validAuthoring({
          captions: [
            {
              type: "short_1line",
              lines: ["سطر"],
              position: "top",
              display: { start: 2.0, end: 5.0 }, // overlaps the hook (top, 0–3)
            },
            {
              type: "long_2lines",
              lines: ["سطر أول", "سطر ثانٍ"],
              position: "bottom",
              display: { start: 10.0, end: 15.0 }, // past the 14 s clip end
            },
          ],
        }),
      }),
    (err: unknown) => {
      const message = (err as Error).message;
      assert.match(message, /"hook" and "captions\.0" both sit at position "top" and overlap/);
      assert.match(message, /captions\.1: display window must sit inside the clip/);
      return true;
    },
  );
});

test("a malformed package yields one report listing every problem", () => {
  try {
    resolveReelPackage({
      clipId: "reel-x",
      packageDir: "reels/reel-x",
      sidecar: validSidecar({ durationInSeconds: 10 }),
      authoring: validAuthoring({
        clipId: "reel-WRONG",
        kind: "promo",
        hook: { text: "خطاف", position: "top", display: { start: 5, end: 4 } },
        captions: [
          {
            type: "long_2lines",
            lines: ["سطر واحد فقط"], // long_2lines with 1 line
            position: "bottom",
            display: { start: 8, end: 12 }, // beyond the 10 s clip
          },
        ],
      }),
    });
    assert.fail("expected resolveReelPackage to throw");
  } catch (err) {
    const message = (err as Error).message;
    assert.match(message, /Invalid reel package "reel-x" — \d+ problems:/);
    assert.match(message, /clipId mismatch/);
    assert.match(message, /a promo must have zero captions/);
    assert.match(message, /hook: display\.end must be greater than display\.start/);
    assert.match(message, /long_2lines must have exactly 2 lines/);
    assert.match(message, /display window must sit inside the clip/);
    // Every problem in ONE throw — at least 5 bullet points.
    assert.ok(message.split("•").length - 1 >= 5, `expected >= 5 bullets in:\n${message}`);
  }
});

test("structurally broken sidecar reports zod issues with file + path", () => {
  assert.throws(
    () =>
      resolveReelPackage({
        clipId: "reel-x",
        packageDir: "reels/reel-x",
        sidecar: { schemaVersion: 2, width: -5, height: 1920, fps: 30 },
      }),
    (err: unknown) => {
      const message = (err as Error).message;
      assert.match(message, /remotion\.json → width/);
      assert.match(message, /remotion\.json → durationInSeconds/);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// The reelzy emitter dialect (sidecar schemaVersion 1: id/duration, seconds
// floats, fraction safeArea, faces inside framing segments)

test("real reelzy v1 sidecar normalises into the canonical package", () => {
  const pkg = resolveReelPackage({
    clipId: "reel-001",
    packageDir: "reels/reel-001",
    sidecar: {
      schemaVersion: 1,
      id: "reel-001",
      video: "reel-9x16.mp4",
      width: 1080,
      height: 1920,
      fps: 30,
      duration: 26.47,
      aspect: "9:16",
      language: "ar",
      direction: "rtl",
      title: "عنوان",
      safeArea: { captionBottomPct: 0.2, hookTopPct: 0.14 },
      words: [{ text: "ذيك", start: 0.0, end: 0.44, srcStart: 1017.13, probability: 0.613 }],
      captions: [
        {
          start: 0.0,
          end: 1.22,
          text: "ذيك غروف",
          words: [
            { text: "ذيك", start: 0.0, end: 0.44 },
            { text: "غروف", start: 0.44, end: 1.22 },
          ],
        },
      ],
      segments: [
        {
          t0: 0.0,
          t1: 26.47,
          mode: "single_close",
          faces: [{ x: 0.5, y: 0.24, w: 0.55, h: 0.5 }],
        },
      ],
      cuts: [],
      authoring: validAuthoring({
        clipId: "reel-001",
        hook: { text: "خطاف", position: "top", display: { start: 0, end: 3 } },
        captions: [],
      }),
      captionSource: "authored",
      audio: "reel-9x16.m4a",
    },
  });

  assert.equal(pkg.media.durationInFrames, 794); // 26.47 s @ 30 fps
  assert.equal(pkg.media.audioSrc, "reels/reel-001/reel-9x16.m4a");
  assert.deepEqual(pkg.safeArea, { topPct: 14, bottomPct: 20, sidePct: 7 });
  // Seconds → ms, once, at ingest.
  assert.deepEqual(pkg.asr.words, [{ text: "ذيك", startMs: 0, endMs: 440 }]);
  const cue = pkg.asr.captions?.segments[0];
  assert.equal(cue?.id, "cue-001");
  assert.equal(cue?.startMs, 0);
  assert.equal(cue?.endMs, 1220);
  // Centre-anchored face fractions → top-left percent rects.
  assert.deepEqual(pkg.director?.faces, [{ xPct: 22.5, yPct: 0, wPct: 55, hPct: 50 }]);
});

test("bare-array captions.json (reelzy seconds cues) is accepted", () => {
  const sidecar = validSidecar({ captionSource: undefined, authoring: undefined });
  delete (sidecar as Record<string, unknown>)["captionSource"];
  delete (sidecar as Record<string, unknown>)["authoring"];
  const pkg = resolveReelPackage({
    clipId: "reel-x",
    packageDir: "reels/reel-x",
    sidecar,
    asrCaptions: [
      {
        start: 1.5,
        end: 2.5,
        text: "كلمة أولى",
        words: [
          { text: "كلمة", start: 1.5, end: 2.0 },
          { text: "أولى", start: 2.0, end: 2.5 },
        ],
      },
    ],
  });
  assert.equal(pkg.asr.captions?.segments[0]?.id, "cue-001");
  assert.equal(pkg.asr.captions?.segments[0]?.startMs, 1500);
});

// ---------------------------------------------------------------------------
// Fixtures on disk (the committed batch)

test("all four fixture packages load from disk", () => {
  const { packages, failures, index } = discoverReels(fixturesDir);
  assert.deepEqual(failures, []);
  assert.deepEqual(
    packages.map((p) => p.clipId),
    ["asr-001", "promo-001", "reel-001", "reel-002"],
  );
  assert.equal(index?.mode, "mixed");

  const byId = new Map(packages.map((p) => [p.clipId, p]));
  assert.equal(byId.get("asr-001")?.captionSource, "asr");
  assert.equal(byId.get("promo-001")?.kind, "promo");
  assert.equal(byId.get("promo-001")?.authored?.captions.length, 0);
  assert.equal(byId.get("reel-001")?.authored?.captions.length, 2);
  assert.equal(byId.get("reel-002")?.authored?.captions.length, 1);
});

test("reel-001 fixture matches the acceptance choreography", () => {
  const pkg = loadReelPackageFromDisk(join(fixturesDir, "reel-001"), "reels/reel-001");
  assert.equal(pkg.media.durationInFrames, 660); // 22 s @ 30 fps
  assert.equal(pkg.direction, "rtl");
  assert.equal(pkg.authored?.channel, "أسمار وأفكار");
  assert.deepEqual(pkg.authored?.hook.window, { startFrame: 0, endFrame: 90 });
  const [short, long] = pkg.authored!.captions;
  assert.equal(short?.type, "short_1line");
  assert.equal(short?.position, "top");
  assert.deepEqual(short?.window, { startFrame: 360, endFrame: 450 });
  assert.equal(long?.type, "long_2lines");
  assert.equal(long?.position, "bottom");
  assert.equal(long?.lines.length, 2);
  assert.deepEqual(long?.window, { startFrame: 480, endFrame: 630 });
  assert.equal(pkg.asr.words.length, 13);
  assert.equal(pkg.director?.faces.length, 1);
});
