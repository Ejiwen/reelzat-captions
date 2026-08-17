import type { OverlaySafeArea, OverlayTextZone } from "../types";

type CaptionWidthInput = {
  width: number;
  safeArea: OverlaySafeArea;
  textZone?: OverlayTextZone | null;
  paddingInlinePx: number;
  safeGapPx: number;
};

const scaleFrom1080 = (width: number) => width / 1080;

// The director zone wins when present. Otherwise the usable width is the
// frame minus both safe-area gutters.
export const captionAvailableWidthPx = ({
  width,
  safeArea,
  textZone,
}: Pick<CaptionWidthInput, "width" | "safeArea" | "textZone">): number =>
  width * ((textZone?.wPct ?? 100 - safeArea.sidePct * 2) / 100);

// The card's actual width — it is a plate of one fixed length, not a box that
// shrink-wraps its text, so one-line and multi-line captions are the same
// object. The safe gap on each side keeps it visibly short of the safe-area
// line and gives its glow and shadow somewhere to live.
export const captionCardWidthPx = ({
  width,
  safeArea,
  textZone,
  safeGapPx,
}: Omit<CaptionWidthInput, "paddingInlinePx">): number =>
  Math.max(
    1,
    captionAvailableWidthPx({ width, safeArea, textZone }) -
      safeGapPx * scaleFrom1080(width) * 2,
  );

// Line fitting receives only the room left for glyphs after card padding.
export const captionTextMaxWidthPx = ({
  width,
  safeArea,
  textZone,
  paddingInlinePx,
  safeGapPx,
}: CaptionWidthInput): number =>
  Math.max(
    1,
    captionCardWidthPx({ width, safeArea, textZone, safeGapPx }) -
      paddingInlinePx * scaleFrom1080(width) * 2,
  );

// ---------------------------------------------------------------------------
// Vertical room. Captions are anchored by their BOTTOM edge (just above the
// ProgressBar ring), so growing to a third line pushes the card upward. It may
// never climb past `topLimitPct` of frame height — that region belongs to the
// video content and the faces in it.

export const captionTextMaxHeightPx = ({
  height,
  bottomOffsetPx,
  topLimitPct,
  paddingBlockPx,
}: {
  height: number;
  bottomOffsetPx: number;
  topLimitPct: number;
  paddingBlockPx: number;
}): number =>
  Math.max(
    1,
    height - bottomOffsetPx - height * (topLimitPct / 100) - paddingBlockPx * 2,
  );

// ---------------------------------------------------------------------------
// Line layout. Pure: the caller supplies the measured width of one word at
// font size 1 (see @remotion/layout-utils `measureText`), so this module stays
// free of DOM and testable in node.

export type CaptionLineLayout = {
  // Tokenized lines exactly as they will be rendered.
  lines: string[][];
  fontSize: number;
  // true when the authored line break was replaced by a balanced re-flow.
  reflowed: boolean;
};

export type CaptionLayoutInput = {
  // Authored, tokenized lines — the display truth unless they force the type
  // below `minAuthoredScale`.
  lines: string[][];
  baseFontSize: number;
  maxTextWidthPx: number;
  maxTextHeightPx: number;
  // Rendered height of one line as a multiple of the font size (line-height
  // plus the vertical padding that keeps diacritics unclipped).
  lineBoxEm: number;
  // Flex column-gap between words, in em — counted exactly, which is why the
  // safety scale can stay near 1.
  wordGapEm: number;
  // Width of one word at font size 1.
  unitWidthOf: (word: string) => number;
  // Hard ceiling on rendered lines (1 for CaptionShort, 3 for CaptionLong).
  maxLineCount: number;
  // Below this fraction of the base size, the authored break is considered too
  // expensive and the words are re-balanced instead.
  minAuthoredScale: number;
  // An extra line must buy at least this much type size to be worth it.
  extraLineGain: number;
  safetyScale: number;
  // Poetry and other author-fixed layouts must retain every authored break.
  preserveLines?: boolean;
};

// Split `words` into exactly `lineCount` contiguous lines so the WIDEST line
// is as narrow as possible — the classic balanced-wrap objective. Word order
// is never changed: Arabic reads badly under any re-grouping that is not a
// plain break.
export const balanceWordsIntoLines = (
  words: string[],
  lineCount: number,
  unitWidthOfLine: (words: string[]) => number,
): string[][] => {
  const total = words.length;
  const k = Math.max(1, Math.min(lineCount, total));
  if (k <= 1 || total === 0) {
    return [words];
  }

  type Split = { worst: number; lines: string[][] };
  const memo = new Map<string, Split>();
  const solve = (start: number, remaining: number): Split => {
    if (remaining === 1) {
      const slice = words.slice(start);
      return { worst: unitWidthOfLine(slice), lines: [slice] };
    }
    const key = `${start}:${remaining}`;
    const cached = memo.get(key);
    if (cached) {
      return cached;
    }
    // Every remaining line must still receive at least one word.
    const maxTake = total - start - (remaining - 1);
    let best: Split | null = null;
    for (let take = 1; take <= maxTake; take++) {
      const head = words.slice(start, start + take);
      const rest = solve(start + take, remaining - 1);
      const worst = Math.max(unitWidthOfLine(head), rest.worst);
      if (best === null || worst < best.worst) {
        best = { worst, lines: [head, ...rest.lines] };
      }
    }
    const resolved = best!;
    memo.set(key, resolved);
    return resolved;
  };

  return solve(0, k).lines;
};

const sameLines = (a: string[][], b: string[][]): boolean =>
  a.length === b.length &&
  a.every((line, i) => line.join(" ") === (b[i] ?? []).join(" "));

// Pick the layout that keeps the type as large as possible while respecting
// the author's break. Order of preference:
//   1. the authored lines, if they still fit at a respectable size;
//   2. the same number of lines, re-balanced;
//   3. one extra line — but only if it buys a visibly bigger font.
export const chooseCaptionLayout = ({
  lines,
  baseFontSize,
  maxTextWidthPx,
  maxTextHeightPx,
  lineBoxEm,
  wordGapEm,
  unitWidthOf,
  maxLineCount,
  minAuthoredScale,
  extraLineGain,
  safetyScale,
  preserveLines = false,
}: CaptionLayoutInput): CaptionLineLayout => {
  const unitWidthOfLine = (words: string[]): number =>
    words.reduce((sum, word) => sum + unitWidthOf(word), 0) +
    Math.max(0, words.length - 1) * wordGapEm;

  const sizeOf = (candidate: string[][]): number => {
    const widest = candidate.reduce(
      (max, line) => Math.max(max, unitWidthOfLine(line)),
      0,
    );
    const byWidth =
      widest > 0 ? (maxTextWidthPx / widest) * safetyScale : baseFontSize;
    const byHeight = maxTextHeightPx / (candidate.length * lineBoxEm);
    return Math.max(1, Math.min(baseFontSize, byWidth, byHeight));
  };

  const authored: CaptionLineLayout = {
    lines,
    fontSize: sizeOf(lines),
    reflowed: false,
  };
  if (preserveLines) {
    return authored;
  }
  if (authored.fontSize >= baseFontSize * minAuthoredScale) {
    return authored;
  }

  const words = lines.flat();
  const ceiling = Math.min(maxLineCount, Math.max(1, words.length));
  let best = authored;
  for (let count = lines.length; count <= ceiling; count++) {
    const candidate = balanceWordsIntoLines(words, count, unitWidthOfLine);
    const fontSize = sizeOf(candidate);
    const required =
      best.fontSize *
      (candidate.length > best.lines.length ? extraLineGain : 1);
    if (fontSize > required) {
      best = {
        lines: candidate,
        fontSize,
        reflowed: !sameLines(candidate, lines),
      };
    }
  }
  return best;
};
