import assert from "node:assert/strict";
import { test } from "node:test";
import { captionEnergyConfig } from "../src/overlays/CaptionEnergy/config";
import {
  balanceWordsIntoLines,
  captionAvailableWidthPx,
  captionCardWidthPx,
  captionTextMaxHeightPx,
  captionTextMaxWidthPx,
  chooseCaptionLayout,
} from "../src/overlays/CaptionEnergy/math";
import { DEFAULT_SAFE_AREA } from "../src/overlays/types";
import {
  activeAuthoredWordIndex,
  exactActiveAuthoredWordIndex,
  wordsTemplateWordStyle,
  isAuthoredWordEmphasised,
} from "../src/overlays/CaptionLines";
import { captionSplitPlacementAtFrame } from "../src/overlays/captionSplitPlacement";

// ---------------------------------------------------------------------------
// Split-screen placement

const splitWindow = { startFrame: 100, endFrame: 200, centerYPct: 50 };

test("caption reaches the centre when a top/bottom split begins", () => {
  assert.deepEqual(
    captionSplitPlacementAtFrame({
      frame: 100,
      fps: 30,
      windows: [splitWindow],
    }),
    { mix: 1, centerYPct: 50 },
  );
});

test("caption anticipates the split and settles back after it", () => {
  const before = captionSplitPlacementAtFrame({
    frame: 96,
    fps: 30,
    windows: [splitWindow],
  });
  const after = captionSplitPlacementAtFrame({
    frame: 204,
    fps: 30,
    windows: [splitWindow],
  });
  assert.equal(before.mix, 0.5);
  assert.equal(after.mix, 0.5);
  assert.equal(
    captionSplitPlacementAtFrame({
      frame: 209,
      fps: 30,
      windows: [splitWindow],
    }).mix,
    0,
  );
});

test("reduced motion changes placement only inside the split window", () => {
  assert.equal(
    captionSplitPlacementAtFrame({
      frame: 99,
      fps: 30,
      windows: [splitWindow],
      reduced: true,
    }).mix,
    0,
  );
  assert.equal(
    captionSplitPlacementAtFrame({
      frame: 100,
      fps: 30,
      windows: [splitWindow],
      reduced: true,
    }).mix,
    1,
  );
});

// ---------------------------------------------------------------------------
// Horizontal fitting

test("caption card, padding and safe gap fit inside the default side safe area", () => {
  const input = {
    width: 1080,
    safeArea: DEFAULT_SAFE_AREA,
    paddingInlinePx: captionEnergyConfig.surfacePaddingInlinePx,
    safeGapPx: captionEnergyConfig.surfaceSafeGapPx,
  };
  const available = captionAvailableWidthPx(input);
  const card = captionCardWidthPx(input);
  const text = captionTextMaxWidthPx(input);

  assert.equal(available, 928.8);
  assert.equal(card + captionEnergyConfig.surfaceSafeGapPx * 2, available);
  assert.equal(text + captionEnergyConfig.surfacePaddingInlinePx * 2, card);
});

test("the card is a long plate that still stops short of the safe edge", () => {
  const input = {
    width: 1080,
    safeArea: DEFAULT_SAFE_AREA,
    safeGapPx: captionEnergyConfig.surfaceSafeGapPx,
  };
  const available = captionAvailableWidthPx(input);
  const card = captionCardWidthPx(input);
  const ratio = card / available;
  assert.ok(ratio > 0.85, `card should read as long, got ${ratio}`);
  assert.ok(ratio < 0.95, `card must not touch the safe edge, got ${ratio}`);
  // A gap wide enough to see at 1080 — not a hairline.
  assert.ok((available - card) / 2 >= 24);
});

test("caption safe widths scale proportionally with the composition", () => {
  const makeInput = (width: number) => ({
    width,
    safeArea: DEFAULT_SAFE_AREA,
    paddingInlinePx: captionEnergyConfig.surfacePaddingInlinePx,
    safeGapPx: captionEnergyConfig.surfaceSafeGapPx,
  });
  const full = captionTextMaxWidthPx(makeInput(1080));
  const half = captionTextMaxWidthPx(makeInput(540));
  assert.equal(half * 2, full);
});

test("a director text zone narrows caption fitting further", () => {
  const base = {
    width: 1080,
    safeArea: DEFAULT_SAFE_AREA,
    paddingInlinePx: captionEnergyConfig.surfacePaddingInlinePx,
    safeGapPx: captionEnergyConfig.surfaceSafeGapPx,
  };
  const defaultWidth = captionTextMaxWidthPx(base);
  const zoneWidth = captionTextMaxWidthPx({
    ...base,
    textZone: { xPct: 20, yPct: 65, wPct: 60, hPct: 18 },
  });
  assert.ok(zoneWidth < defaultWidth);
});

// ---------------------------------------------------------------------------
// Vertical room — a third line grows the card upward, never downward.

test("vertical room is the gap between the bottom anchor and the top limit", () => {
  const height = captionTextMaxHeightPx({
    height: 1920,
    bottomOffsetPx: 435,
    topLimitPct: 50,
    paddingBlockPx: 20,
  });
  // 1920 - 435 (card bottom edge) - 960 (top limit) - 2×20 padding.
  assert.equal(height, 485);
  // Three lines of the default caption box still fit comfortably.
  assert.ok(height / (3 * 2) > 60);
});

test("vertical room never goes negative", () => {
  assert.ok(
    captionTextMaxHeightPx({
      height: 1920,
      bottomOffsetPx: 1800,
      topLimitPct: 50,
      paddingBlockPx: 20,
    }) > 0,
  );
});

// ---------------------------------------------------------------------------
// Line balancing. Unit widths below are "characters", which keeps the
// arithmetic readable — the real caller measures glyphs.

const unitWidthOf = (word: string) => word.length;
const widthOfLine = (words: string[]) =>
  words.reduce((sum, w) => sum + unitWidthOf(w), 0) +
  Math.max(0, words.length - 1) * 0.35;

test("balancing minimises the widest line and never reorders words", () => {
  const words = ["aaaa", "b", "cc", "ddddd", "e"];
  const lines = balanceWordsIntoLines(words, 2, widthOfLine);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines.flat(), words);
  const widest = Math.max(...lines.map(widthOfLine));
  // Every other contiguous 2-way split is at least as wide.
  for (let cut = 1; cut < words.length; cut++) {
    const alternative = Math.max(
      widthOfLine(words.slice(0, cut)),
      widthOfLine(words.slice(cut)),
    );
    assert.ok(widest <= alternative + 1e-9);
  }
});

test("balancing clamps to the number of words available", () => {
  assert.equal(balanceWordsIntoLines(["one", "two"], 3, widthOfLine).length, 2);
  assert.deepEqual(balanceWordsIntoLines(["one"], 3, widthOfLine), [["one"]]);
});

// ---------------------------------------------------------------------------
// Layout choice

const layoutInput = {
  baseFontSize: 50,
  maxTextHeightPx: 400,
  lineBoxEm: 2,
  wordGapEm: 0.35,
  unitWidthOf: () => 2,
  maxLineCount: captionEnergyConfig.maxLineCount,
  minAuthoredScale: captionEnergyConfig.reflowMinScale,
  extraLineGain: captionEnergyConfig.extraLineGain,
  safetyScale: 1,
};

test("the authored break survives while it holds a confident size", () => {
  const lines = [
    ["سطر", "أول", "متوازن"],
    ["وسطر", "ثانٍ", "يكمله"],
  ];
  const layout = chooseCaptionLayout({
    ...layoutInput,
    lines,
    maxTextWidthPx: 2000,
  });
  assert.deepEqual(layout.lines, lines);
  assert.equal(layout.reflowed, false);
  assert.equal(layout.fontSize, 50); // base size, no shrinking needed
});

test("a break that shrinks the type too far is re-balanced into a third line", () => {
  const lines = [
    ["و1", "و2", "و3", "و4"],
    ["و5", "و6", "و7", "و8", "و9"],
  ];
  const layout = chooseCaptionLayout({
    ...layoutInput,
    lines,
    maxTextWidthPx: 400,
  });
  assert.equal(layout.lines.length, 3);
  assert.equal(layout.reflowed, true);
  assert.deepEqual(layout.lines.flat(), lines.flat());
  // Bigger type than the authored two-line break could ever produce.
  assert.ok(layout.fontSize > 400 / 11.4);
});

test("a third line is refused when it does not buy enough type size", () => {
  // Two long words: a third line would leave one of them alone and change
  // nothing about the widest line, so two lines must win.
  const lines = [["طويلة"], ["كلمة"]];
  const layout = chooseCaptionLayout({
    ...layoutInput,
    lines,
    unitWidthOf: (word: string) => (word === "طويلة" ? 40 : 4),
    maxTextWidthPx: 400,
  });
  assert.equal(layout.lines.length, 2);
});

test("no vertical room means fewer lines, never an overflowing card", () => {
  const lines = [
    ["و1", "و2", "و3", "و4"],
    ["و5", "و6", "و7", "و8", "و9"],
  ];
  const layout = chooseCaptionLayout({
    ...layoutInput,
    lines,
    maxTextWidthPx: 400,
    // Room for two lines of ~35px only.
    maxTextHeightPx: 140,
  });
  assert.ok(layout.lines.length * layout.fontSize * 2 <= 140 + 1e-9);
});

test("CaptionShort never wraps: one authored line stays one line", () => {
  const lines = [["كلمة", "واحدة", "طويلة", "جدا", "هنا"]];
  const layout = chooseCaptionLayout({
    ...layoutInput,
    lines,
    maxTextWidthPx: 120,
    maxLineCount: 1,
  });
  assert.equal(layout.lines.length, 1);
  assert.equal(layout.reflowed, false);
  assert.ok(layout.fontSize < 50);
});

test("verse preserves every authored hemistich even when balancing would win", () => {
  const lines = [
    ["على", "قدر", "أهل", "العزم"],
    ["تأتي", "العزائم"],
    ["وتأتي", "المكارم"],
  ];
  const layout = chooseCaptionLayout({
    ...layoutInput,
    lines,
    maxTextWidthPx: 120,
    maxLineCount: lines.length,
    preserveLines: true,
  });
  assert.deepEqual(layout.lines, lines);
  assert.equal(layout.lines.length, 3);
  assert.equal(layout.reflowed, false);
});

test("authored emphasis matches normalized whole tokens only", () => {
  assert.equal(isAuthoredWordEmphasised("  السؤال ", ["السؤال"]), true);
  assert.equal(isAuthoredWordEmphasised("الحفظُ،", ["الحفظ"]), true);
  assert.equal(isAuthoredWordEmphasised("رحمة", ["رحمه"]), true);
  assert.equal(isAuthoredWordEmphasised("فتى", ["فتي"]), true);
  assert.equal(isAuthoredWordEmphasised("السؤال", ["سؤال"]), false);
});

test("authored active word index follows frame timings", () => {
  const words = [
    { startFrame: 10, endFrame: 20 },
    { startFrame: 20, endFrame: 30 },
    { startFrame: 30, endFrame: 40 },
  ];
  assert.equal(activeAuthoredWordIndex(9, words), -1);
  assert.equal(activeAuthoredWordIndex(20, words), 1);
  assert.equal(activeAuthoredWordIndex(35, words), 2);
  assert.equal(exactActiveAuthoredWordIndex(20, words), 1);
  assert.equal(exactActiveAuthoredWordIndex(45, words), -1);
});

test("words template gives only the spoken word the full gold glow", () => {
  const timing = { startFrame: 10, endFrame: 20 };
  const active = wordsTemplateWordStyle({
    frame: 14,
    fps: 30,
    timing,
    isActive: true,
    isPast: false,
  });
  const waiting = wordsTemplateWordStyle({
    frame: 5,
    fps: 30,
    timing,
    isActive: false,
    isPast: false,
  });
  assert.match(String(active.textShadow), /242,201,76,0\.86/);
  assert.equal(active.opacity, 1);
  assert.equal(waiting.opacity, 0.46);
});
