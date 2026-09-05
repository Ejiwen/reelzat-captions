import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeWordIndexAtFrame,
  framesFromSeconds,
  groupPresenceAtFrame,
  hasUsableWordTiming,
  wordEntranceFrames,
  wordEntranceProgress,
  wordStateAtFrame,
  wordsGroupIndexAtFrame,
} from "../src/overlays/CaptionWords/math";
import { tokenizeLine } from "../src/schema/captions";

// Contiguous windows exactly as the reelzy emitter produces them: each word
// ends where the next begins, the last one at the caption boundary.
const words = [
  { startFrame: 100, endFrame: 108 },
  { startFrame: 108, endFrame: 112 },
  { startFrame: 112, endFrame: 180 }, // a long silence follows this word
];

test("word states are start-inclusive and end-exclusive", () => {
  assert.equal(wordStateAtFrame(99, words[0]!), "upcoming");
  assert.equal(wordStateAtFrame(100, words[0]!), "active");
  assert.equal(wordStateAtFrame(107, words[0]!), "active");
  assert.equal(wordStateAtFrame(108, words[0]!), "spoken");
  assert.equal(wordStateAtFrame(108, words[1]!), "active");
});

test("exactly one word is active at a boundary frame", () => {
  assert.equal(activeWordIndexAtFrame(99, words), -1);
  assert.equal(activeWordIndexAtFrame(100, words), 0);
  assert.equal(activeWordIndexAtFrame(108, words), 1);
  assert.equal(activeWordIndexAtFrame(111, words), 1);
  assert.equal(activeWordIndexAtFrame(112, words), 2);
});

test("a long window settles to spoken after the active hold cap", () => {
  const hold = framesFromSeconds(1.1, 30); // 33 frames
  assert.equal(hold, 33);
  assert.equal(wordStateAtFrame(112 + 32, words[2]!, hold), "active");
  assert.equal(wordStateAtFrame(112 + 33, words[2]!, hold), "spoken");
  assert.equal(activeWordIndexAtFrame(160, words, hold), -1);
  // Without a cap the window is trusted literally.
  assert.equal(wordStateAtFrame(179, words[2]!), "active");
  assert.equal(wordStateAtFrame(180, words[2]!), "spoken");
});

test("entrance never outlasts a short word and is visible on the onset frame", () => {
  const rapid = { startFrame: 50, endFrame: 53 };
  const frames = wordEntranceFrames(rapid, 30, 0.14);
  assert.equal(frames, 3);
  assert.equal(wordEntranceFrames({ startFrame: 0, endFrame: 40 }, 30, 0.14), 4);
  assert.equal(wordEntranceProgress(49, rapid, frames), 0);
  assert.ok(wordEntranceProgress(50, rapid, frames) > 0);
  assert.equal(wordEntranceProgress(52, rapid, frames), 1);
  assert.equal(wordEntranceProgress(90, rapid, frames), 1);
});

test("usable timing requires one ordered, non-empty window per token", () => {
  const tokens = tokenizeLine("هذا الوسواس دليل");
  assert.equal(tokens.length, 3);
  assert.equal(hasUsableWordTiming(words, 3), true);
  assert.equal(hasUsableWordTiming(words, 4), false);
  assert.equal(hasUsableWordTiming(undefined, 3), false);
  assert.equal(
    hasUsableWordTiming(
      [
        { startFrame: 10, endFrame: 20 },
        { startFrame: 15, endFrame: 25 }, // overlaps
        { startFrame: 25, endFrame: 30 },
      ],
      3,
    ),
    false,
  );
  assert.equal(
    hasUsableWordTiming(
      [
        { startFrame: 10, endFrame: 10 }, // empty
        { startFrame: 10, endFrame: 20 },
        { startFrame: 20, endFrame: 30 },
      ],
      3,
    ),
    false,
  );
});

test("groups never share a frame and the plate is gone on the boundary", () => {
  const captions = [
    {
      type: "regular" as const,
      lines: ["الأول"],
      position: "bottom" as const,
      window: { startFrame: 30, endFrame: 60 },
      verse: false,
    },
    {
      type: "regular" as const,
      lines: ["الثاني"],
      position: "bottom" as const,
      window: { startFrame: 60, endFrame: 90 },
      verse: false,
    },
  ];
  assert.equal(wordsGroupIndexAtFrame(captions, 29), -1);
  assert.equal(wordsGroupIndexAtFrame(captions, 30), 0);
  assert.equal(wordsGroupIndexAtFrame(captions, 59), 0);
  assert.equal(wordsGroupIndexAtFrame(captions, 60), 1);
  assert.equal(wordsGroupIndexAtFrame(captions, 90), -1);

  const window = { startFrame: 30, endFrame: 60 };
  assert.equal(groupPresenceAtFrame(29, window, 4, 5), 0);
  assert.equal(groupPresenceAtFrame(30, window, 4, 5), 0.25);
  assert.equal(groupPresenceAtFrame(33, window, 4, 5), 1);
  assert.equal(groupPresenceAtFrame(45, window, 4, 5), 1);
  assert.equal(groupPresenceAtFrame(59, window, 4, 5), 0);
  assert.equal(groupPresenceAtFrame(60, window, 4, 5), 0);
  // Tiny groups still fade rather than pop.
  assert.equal(groupPresenceAtFrame(31, { startFrame: 30, endFrame: 33 }, 4, 5), 1);
});
