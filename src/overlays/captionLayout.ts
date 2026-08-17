import { measureText } from "@remotion/layout-utils";
import { fontFamily, reelTypography } from "../design/fonts";
import { spacing, typeScale } from "../design/tokens";
import { captionEnergyConfig } from "./CaptionEnergy/config";
import {
  chooseCaptionLayout,
  type CaptionLineLayout,
} from "./CaptionEnergy/math";

// The measuring half of caption line layout: it turns real font metrics into
// the per-word unit widths that the pure chooser in CaptionEnergy/math.ts
// works with. Words are measured ONE BY ONE at a probe size and the flex
// column-gap is added analytically, so the fitted size is exact rather than
// "close enough with a safety margin" — which is where the extra type size
// for the caption card comes from.

const PROBE_FONT_SIZE = 100;

const unitWidthCache = new Map<string, number>();

// Width of one word at font size 1. Text metrics are linear in font size, so
// one probe measurement serves every size.
export const captionWordUnitWidth = (word: string): number => {
  const cached = unitWidthCache.get(word);
  if (cached !== undefined) {
    return cached;
  }
  const { width } = measureText({
    text: word,
    fontFamily,
    fontWeight: reelTypography.caption,
    fontSize: PROBE_FONT_SIZE,
    validateFontIsLoaded: true,
  });
  const unit = width / PROBE_FONT_SIZE;
  unitWidthCache.set(word, unit);
  return unit;
};

// Rendered height of one line as a multiple of the font size: the line box
// plus the vertical padding that keeps Arabic diacritics unclipped.
export const captionLineBoxEm =
  typeScale.lineHeight + spacing.linePaddingBlockEm * 2;

export const measureCaptionLayout = ({
  lines,
  baseFontSize,
  maxTextWidthPx,
  maxTextHeightPx,
  maxLineCount,
  preserveLines = false,
}: {
  lines: string[][];
  baseFontSize: number;
  maxTextWidthPx: number;
  maxTextHeightPx: number;
  maxLineCount: number;
  preserveLines?: boolean;
}): CaptionLineLayout =>
  chooseCaptionLayout({
    lines,
    baseFontSize,
    maxTextWidthPx,
    maxTextHeightPx,
    lineBoxEm: captionLineBoxEm,
    wordGapEm: spacing.wordGapEm,
    unitWidthOf: captionWordUnitWidth,
    maxLineCount,
    minAuthoredScale: captionEnergyConfig.reflowMinScale,
    extraLineGain: captionEnergyConfig.extraLineGain,
    safetyScale: captionEnergyConfig.textFitSafetyScale,
    preserveLines,
  });
