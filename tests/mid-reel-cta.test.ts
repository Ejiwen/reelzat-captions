import assert from "node:assert/strict";
import test from "node:test";
import { findMidReelCtaWindow } from "../src/overlays/MidReelCta/math";

test("places the CTA at the midpoint when that span is quiet", () => {
  assert.deepEqual(
    findMidReelCtaWindow({
      durationInFrames: 900,
      fps: 30,
      occupiedWindows: [],
    }),
    { startFrame: 357, endFrame: 543 },
  );
});

test("keeps the CTA at the midpoint even when captions are active", () => {
  const window = findMidReelCtaWindow({
    durationInFrames: 794,
    fps: 30,
    occupiedWindows: [
      { startFrame: 0, endFrame: 150 },
      { startFrame: 352, endFrame: 443 },
      { startFrame: 472, endFrame: 623 },
    ],
  });

  assert.deepEqual(window, { startFrame: 304, endFrame: 490 });
});

test("omits the CTA when no quiet span can fit", () => {
  assert.equal(
    findMidReelCtaWindow({
      durationInFrames: 180,
      fps: 30,
      occupiedWindows: [{ startFrame: 0, endFrame: 180 }],
    }),
    null,
  );
});
