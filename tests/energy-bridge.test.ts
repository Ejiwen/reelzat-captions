import assert from "node:assert/strict";
import { test } from "node:test";
import { progressBarConfig } from "../src/overlays/ProgressBar/config";
import {
  facebookSafeRegionBottomPx,
  getProgressBarGeometry,
} from "../src/overlays/ProgressBar/math";
import { hookEnergyTimeline } from "../src/overlays/HookEnergyBridge/animations";
import { hookEnergyBridgeConfig } from "../src/overlays/HookEnergyBridge/config";
import {
  bezierPoint,
  bridgeControlPoint,
  getHookBgGeometry,
  midpoint,
} from "../src/overlays/HookEnergyBridge/math";
import { hookConfig } from "../src/overlays/Hook/config";
import { hookBgPalettes, resolveHookBgTheme } from "../src/overlays/HookBg/themes";

// ---------------------------------------------------------------------------
// ProgressBar geometry — the energy source must be the ring's exact centre.

test("progress bar centre X is exactly width / 2", () => {
  for (const [w, h] of [
    [1080, 1920],
    [540, 960],
  ] as const) {
    const geo = getProgressBarGeometry({ width: w, height: h, config: progressBarConfig });
    assert.equal(geo.centerX, w / 2);
  }
});

test("progress bar centre Y matches the Facebook 4:5 safe-region placement", () => {
  const geo = getProgressBarGeometry({ width: 1080, height: 1920, config: progressBarConfig });
  const expected =
    facebookSafeRegionBottomPx(1080, 1920, progressBarConfig.facebookSafeAspectRatio) -
    progressBarConfig.safeAreaInsetPx;
  assert.equal(geo.centerY, expected);
  // 4:5 inside 1080×1920 → safe bottom at 1635, inset 12 → 1623.
  assert.equal(geo.centerY, 1623);
});

test("geometry scales linearly with width (540×960 is half of 1080×1920)", () => {
  const full = getProgressBarGeometry({ width: 1080, height: 1920, config: progressBarConfig });
  const half = getProgressBarGeometry({ width: 540, height: 960, config: progressBarConfig });
  assert.equal(half.scale, 0.5);
  assert.equal(half.centerX * 2, full.centerX);
  assert.equal(half.centerY * 2, full.centerY);
  assert.equal(half.ringRadius * 2, full.ringRadius);
  assert.equal(half.logoRadius * 2, full.logoRadius);
});

// ---------------------------------------------------------------------------
// Energy timeline

const WINDOW = { startFrame: 0, endFrame: 150 };

test("entrance phases are strictly ordered and the hold begins after settle", () => {
  const tl = hookEnergyTimeline({ window: WINDOW, fps: 30, config: hookEnergyBridgeConfig });
  assert.ok(tl.ignitionStart < tl.travelStart);
  assert.ok(tl.travelStart < tl.arrivalStart);
  assert.ok(tl.arrivalStart < tl.settleStart);
  assert.ok(tl.settleStart < tl.settleEnd);
  // Stable hold exists between settle and return.
  assert.ok(tl.settleEnd < tl.returnStart);
});

test("the return interval stays inside the Hook window", () => {
  const tl = hookEnergyTimeline({ window: WINDOW, fps: 30, config: hookEnergyBridgeConfig });
  assert.ok(tl.returnStart >= WINDOW.startFrame);
  assert.ok(tl.returnEnd <= WINDOW.endFrame);
});

test("very short Hook windows clamp safely with ordered phases", () => {
  const short = { startFrame: 10, endFrame: 34 }; // 24 frames total
  const tl = hookEnergyTimeline({ window: short, fps: 30, config: hookEnergyBridgeConfig });
  assert.ok(tl.ignitionStart < tl.travelStart);
  assert.ok(tl.travelStart < tl.arrivalStart);
  assert.ok(tl.arrivalStart < tl.settleStart);
  assert.ok(tl.settleStart < tl.settleEnd);
  // Entrance confined to the first half of the window.
  assert.ok(tl.settleEnd - short.startFrame <= 12);
  assert.ok(tl.returnStart >= tl.settleEnd);
  assert.ok(tl.returnEnd <= short.endFrame);
});

// ---------------------------------------------------------------------------
// Destination geometry + path

test("HookBg geometry derives from hookConfig, not hardcoded values", () => {
  const geo = getHookBgGeometry({ width: 1080, height: 1920 });
  assert.equal(geo.centerX, 540);
  assert.equal(geo.centerY, (1920 * hookConfig.yPct) / 100);
  const bandPx = (1920 * hookConfig.bandHeightPct) / 100;
  assert.equal(geo.height, (bandPx * hookConfig.background.heightPct) / 100);
  // Band shape spans the full width.
  if (hookConfig.background.shape === "band") {
    assert.equal(geo.width, 1080);
  }
});

test("the bézier path starts at the source and ends at the target", () => {
  const s = { x: 540, y: 1623 };
  const t = { x: 540, y: 1248 };
  const c = bridgeControlPoint(s, t, 90);
  assert.deepEqual(bezierPoint(s, c, t, 0), s);
  assert.deepEqual(bezierPoint(s, c, t, 1), t);
  // Mid-path bows sideways — never a straight line.
  const mid = bezierPoint(s, c, t, 0.5);
  assert.ok(Math.abs(mid.x - 540) > 20);
  assert.deepEqual(midpoint(s, t), { x: 540, y: 1435.5 });
});

// ---------------------------------------------------------------------------
// Theme handoff — the bridge inherits the SAME resolution as HookBg.

test("bridge palettes exist for every theme the resolver can produce", () => {
  for (const theme of ["politics", "religion", "culture", "general", "social"] as const) {
    const resolved = resolveHookBgTheme({ explicit: theme, fallback: "general" });
    assert.equal(resolved, theme);
    assert.ok(hookBgPalettes[resolved].primary);
    assert.ok(hookBgPalettes[resolved].highlight);
  }
});

test("missing theme falls back exactly like HookBg (default)", () => {
  const resolved = resolveHookBgTheme({
    explicit: undefined,
    text: "لقطة لا تُنسى",
    fallback: hookConfig.background.defaultTheme,
  });
  assert.equal(resolved, hookConfig.background.defaultTheme);
});
