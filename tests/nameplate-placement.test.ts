import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nameplateAvoidanceConfig,
  nameplatePlacementAtFrame,
  nameplateTitleOffsetPx,
  rawNameplatePlacementAtFrame,
  type NameplateAvoidanceLayout,
} from "../src/overlays/Nameplate/placement";
import { nameplateThemeFor } from "../src/overlays/Nameplate/theme";

const fps = 30;
const layout: NameplateAvoidanceLayout = {
  width: 1080,
  height: 1920,
  leftAnchorXPx: 75.6,
  rightAnchorXPx: 939.6,
  defaultCenterYPx: 663,
  safeTopPx: 285,
  safeBottomPx: 1635,
  fullLengthPx: 600,
  compactLengthPx: 250,
  railThicknessPx: 62,
};

test("featured reuses the quiet social nameplate treatment", () => {
  assert.equal(nameplateThemeFor("featured"), "social");
  assert.equal(nameplateThemeFor("culture"), "culture");
  assert.equal(nameplateThemeFor(undefined), undefined);
});

test("disabled choreography preserves the legacy fixed rail", () => {
  const placement = nameplatePlacementAtFrame({
    frame: 900,
    windowEndFrame: 1800,
    fps,
    enabled: false,
    layout,
  });
  assert.equal(placement.side, "left");
  assert.equal(placement.centerYPx, layout.defaultCenterYPx);
  assert.equal(placement.mode, "full");
  assert.equal(placement.opacity, 1);
});

test("animated rail is full from frame zero through thirteen seconds", () => {
  const beforeBoundary = rawNameplatePlacementAtFrame({
    frame: 13 * fps - 1,
    windowEndFrame: 60 * fps,
    fps,
    layout,
  });
  const atBoundary = rawNameplatePlacementAtFrame({
    frame: 13 * fps,
    windowEndFrame: 60 * fps,
    fps,
    layout,
  });
  assert.equal(beforeBoundary.mode, "full");
  assert.equal(atBoundary.mode, "hidden");
});

test("the rail returns exactly seven seconds before the outro", () => {
  const duration = 60 * fps;
  const beforeClosing = rawNameplatePlacementAtFrame({
    frame: duration - 7 * fps - 1,
    windowEndFrame: duration,
    fps,
    layout,
  });
  const closing = nameplatePlacementAtFrame({
    frame: duration - 7 * fps,
    windowEndFrame: duration,
    fps,
    layout,
  });
  assert.equal(beforeClosing.mode, "hidden");
  assert.equal(closing.mode, "full");
  assert.equal(closing.moment, "closing");
  assert.equal(closing.opacity, 0);
});

test("middle disappearance and closing return use soft fixed-edge motion", () => {
  const duration = 60 * fps;
  const midExit = nameplatePlacementAtFrame({
    frame:
      13 * fps + Math.floor(nameplateAvoidanceConfig.transitionFrames / 2),
    windowEndFrame: duration,
    fps,
    layout,
  });
  const closingStart = duration - 7 * fps;
  const midReturn = nameplatePlacementAtFrame({
    frame:
      closingStart +
      Math.floor(nameplateAvoidanceConfig.transitionFrames / 2),
    windowEndFrame: duration,
    fps,
    layout,
  });
  for (const placement of [midExit, midReturn]) {
    assert.equal(placement.anchorXPx, layout.leftAnchorXPx);
    assert.equal(placement.centerYPx, layout.defaultCenterYPx);
    assert.equal(placement.side, "left");
    assert.ok(placement.opacity > 0 && placement.opacity < 1);
    assert.ok(placement.blurPx > 0);
    assert.ok(placement.edgeOffsetPx < 0);
  }
});

test("short clips merge opening and closing moments instead of flickering", () => {
  const duration = 21 * fps;
  const middle = rawNameplatePlacementAtFrame({
    frame: Math.round(duration / 2),
    windowEndFrame: duration,
    fps,
    layout,
  });
  assert.equal(middle.mode, "full");
});

test("long titles rest, pan fully, and reset for the closing appearance", () => {
  const overflowPx = 240;
  const openingStart = 0;
  const rest = nameplateTitleOffsetPx({
    frame: 20,
    momentStartFrame: openingStart,
    momentEndFrame: 390,
    moment: "intro",
    fps,
    overflowPx,
    direction: "rtl",
  });
  const completed = nameplateTitleOffsetPx({
    frame: 300,
    momentStartFrame: openingStart,
    momentEndFrame: 390,
    moment: "intro",
    fps,
    overflowPx,
    direction: "rtl",
  });
  const closingReset = nameplateTitleOffsetPx({
    frame: 1590,
    momentStartFrame: 1590,
    momentEndFrame: 1800,
    moment: "closing",
    fps,
    overflowPx,
    direction: "rtl",
  });
  assert.equal(rest, 0);
  assert.equal(completed, overflowPx);
  assert.equal(closingReset, 0);
});

test("title pan direction follows text direction and ignores short titles", () => {
  const rtl = nameplateTitleOffsetPx({
    frame: 300,
    momentStartFrame: 0,
    momentEndFrame: 390,
    moment: "intro",
    fps,
    overflowPx: 120,
    direction: "rtl",
  });
  const ltr = nameplateTitleOffsetPx({
    frame: 300,
    momentStartFrame: 0,
    momentEndFrame: 390,
    moment: "intro",
    fps,
    overflowPx: 120,
    direction: "ltr",
  });
  const fitting = nameplateTitleOffsetPx({
    frame: 300,
    momentStartFrame: 0,
    momentEndFrame: 390,
    moment: "intro",
    fps,
    overflowPx: 0,
    direction: "rtl",
  });
  assert.equal(rtl, 120);
  assert.equal(ltr, -120);
  assert.equal(fitting, 0);
});

test("even a very long title finishes before the seven-second closing moment ends", () => {
  const closingStart = 1590;
  const closingEnd = 1800;
  const overflowPx = 500;
  const nearEnd = nameplateTitleOffsetPx({
    frame: closingEnd - Math.round(0.45 * fps),
    momentStartFrame: closingStart,
    momentEndFrame: closingEnd,
    moment: "closing",
    fps,
    overflowPx,
    direction: "rtl",
  });
  assert.equal(nearEnd, overflowPx);
});
