import assert from "node:assert/strict";
import test from "node:test";
import { audioEnvelope, duckGainAtFrame } from "../src/sound-identity/math";

test("sound cue envelope starts and ends at digital silence", () => {
  const input = {
    durationInFrames: 60,
    fadeInFrames: 5,
    fadeOutFrames: 12,
    volume: 0.2,
  };
  assert.equal(audioEnvelope({ frame: 0, ...input }), 0);
  assert.equal(audioEnvelope({ frame: 20, ...input }), 0.2);
  assert.equal(audioEnvelope({ frame: 59, ...input }), 0);
});

test("dialogue ducking uses smooth attack, steady gain and smooth release", () => {
  const input = {
    fps: 30,
    windows: [{ startFrame: 30, endFrame: 90, gain: 0.84 }],
    attackSeconds: 0.2,
    releaseSeconds: 0.4,
  };
  assert.equal(duckGainAtFrame({ frame: 29, ...input }), 1);
  assert.equal(duckGainAtFrame({ frame: 50, ...input }), 0.84);
  assert.ok(duckGainAtFrame({ frame: 84, ...input }) > 0.84);
  assert.equal(duckGainAtFrame({ frame: 90, ...input }), 1);
});
