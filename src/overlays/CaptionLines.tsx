import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "../captions/Word";
import { mixOklch, oklchRamp } from "../design/colour";
import { fontFamily, reelTypography } from "../design/fonts";
import {
  motion,
  palette,
  spacing,
  springs,
  textShadow,
  typeScale,
} from "../design/tokens";
import { normalizeAuthoredToken } from "../schema/captions";
import { hookBgPalettes, type HookBgTheme } from "./HookBg/themes";
import { hookConfig } from "./Hook/config";
import { staggeredWordStyle, wordStaggerFrames } from "./wordStagger";

// Shared line renderer for CaptionShort / CaptionLong. Every word is in the
// DOM from the window's first frame (no layout shift); the stagger animates
// opacity + transform only, with a flat word index running across lines.
type CaptionLinesProps = {
  // Tokenized lines — the word is the smallest animatable unit.
  lines: string[][];
  fontSize: number;
  direction: "rtl" | "ltr";
  windowStartFrame: number;
  entranceDelayFrames?: number;
  stagger: boolean;
  reduced?: boolean;
  wrap?: boolean;
  // Template theme. The ink stays neutral for readability; the theme supplies
  // the halo around it, so the caption belongs to the same palette as the
  // hook background and the card underneath.
  theme?: HookBgTheme;
  words?: AuthoredWordFrameTiming[];
  emphasis?: string[];
  verse?: boolean;
};

export type AuthoredWordFrameTiming = {
  startFrame: number;
  endFrame: number;
};

export const isAuthoredWordEmphasised = (
  word: string,
  emphasis: string[] = [],
): boolean => {
  const normalized = normalizeAuthoredToken(word);
  return emphasis.some(
    (candidate) => normalizeAuthoredToken(candidate) === normalized,
  );
};

export const activeAuthoredWordIndex = (
  frame: number,
  words: AuthoredWordFrameTiming[],
): number => {
  let active = -1;
  for (const [index, word] of words.entries()) {
    if (frame >= word.startFrame) {
      active = index;
    }
  }
  return active;
};

const verseInk = mixOklch(palette.ink, palette.gold, 0.35);
const verseAccentRamp = oklchRamp([verseInk, palette.gold]);

export const authoredKaraokeWordStyle = ({
  frame,
  fps,
  timing,
  isActive,
  isPast,
  isEmphasised,
  verse = false,
  foreground = palette.ink,
  mutedForeground = palette.muted,
  accent = palette.cyan,
}: {
  frame: number;
  fps: number;
  timing: AuthoredWordFrameTiming;
  isActive: boolean;
  isPast: boolean;
  isEmphasised: boolean;
  verse?: boolean;
  foreground?: string;
  mutedForeground?: string;
  accent?: string;
}): React.CSSProperties => {
  const themedAccentRamp = oklchRamp([foreground, accent]);
  const transition = motion.wordTransitionFrames;
  const tIn = interpolate(
    frame,
    [timing.startFrame, timing.startFrame + transition],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const tOut = interpolate(
    frame,
    [timing.endFrame, timing.endFrame + transition],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const activeColour = isEmphasised
    ? (verse ? verseAccentRamp : themedAccentRamp)(tIn)
    : mixOklch(mutedForeground, foreground, tIn);
  const settledColour = isEmphasised
    ? verse
      ? palette.gold
      : accent
    : verse
      ? verseInk
      : foreground;
  const springIn =
    frame < timing.startFrame
      ? 0
      : spring({
          frame: frame - timing.startFrame,
          fps,
          config: springs.enter,
        });
  const springOut =
    frame < timing.endFrame
      ? 0
      : spring({ frame: frame - timing.endFrame, fps, config: springs.exit });
  const scale = 1 + (motion.karaokeActiveScale - 1) * (springIn - springOut);
  const settled = isPast || tOut > 0;

  return {
    color: settled ? settledColour : activeColour,
    opacity: settled
      ? isEmphasised
        ? 0.95
        : 0.85
      : isActive
        ? 1
        : isEmphasised
          ? 0.7
          : 0.35,
    transform: `scale(${scale})`,
  };
};

export const CaptionLines: React.FC<CaptionLinesProps> = ({
  lines,
  fontSize,
  direction,
  windowStartFrame,
  entranceDelayFrames = 0,
  stagger,
  reduced,
  wrap = false,
  theme,
  words,
  emphasis,
  verse = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themePalette =
    hookBgPalettes[
      theme ??
        hookConfig.background.themeOverride ??
        hookConfig.background.defaultTheme
    ];
  const themedVerseInk =
    themePalette.surface === "light"
      ? mixOklch(themePalette.foreground, themePalette.accent, 0.28)
      : verseInk;

  // Light cards already provide a controlled contrast field. Any highlight
  // behind their dark ink reads as a moving white duplicate once the words
  // animate, so featured typography is deliberately shadow-free.
  const inkShadow =
    themePalette.surface === "light"
      ? "none"
      : theme
        ? [
            `0 ${(fontSize * 0.03).toFixed(1)}px ${(fontSize * 0.17).toFixed(1)}px rgba(0,0,0,0.55)`,
            `0 0 ${(fontSize * 0.45).toFixed(1)}px color-mix(in oklch, ${themePalette.vignette} 30%, transparent)`,
          ].join(", ")
        : textShadow;

  // One stagger for the whole block, so a long caption lands as fast as a
  // short one — the words simply follow each other more closely.
  const staggerFrames = wordStaggerFrames(
    lines.reduce((count, line) => count + line.length, 0),
  );
  const activeWordIndex = words ? activeAuthoredWordIndex(frame, words) : -1;

  let flatIndex = -1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        direction,
        textAlign: "center",
        fontFamily,
        fontWeight: reelTypography.caption,
        fontSize,
        lineHeight: typeScale.lineHeight,
        color: verse ? themedVerseInk : themePalette.foreground,
        textShadow: inkShadow,
      }}
    >
      {lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          style={{
            display: "flex",
            flexWrap: wrap ? "wrap" : "nowrap",
            justifyContent: "center",
            direction,
            columnGap: `${spacing.wordGapEm}em`,
            paddingBlock: `${spacing.linePaddingBlockEm}em`,
          }}
        >
          {line.map((word, wordIndex) => {
            flatIndex += 1;
            const isEmphasised = isAuthoredWordEmphasised(word, emphasis);
            const timing = words?.[flatIndex];
            const style = timing
              ? authoredKaraokeWordStyle({
                  frame,
                  fps,
                  timing,
                  isActive: flatIndex === activeWordIndex,
                  isPast: flatIndex < activeWordIndex,
                  isEmphasised,
                  verse,
                  foreground: themePalette.foreground,
                  mutedForeground: themePalette.mutedForeground,
                  accent: themePalette.accent,
                })
              : stagger
                ? staggeredWordStyle({
                    frame,
                    fps,
                    index: flatIndex,
                    windowStartFrame: windowStartFrame + entranceDelayFrames,
                    reduced,
                    staggerFrames,
                  })
                : {};
            if (isEmphasised && !timing) {
              style.color = (
                verse
                  ? oklchRamp([themedVerseInk, themePalette.accent])
                  : oklchRamp([themePalette.foreground, themePalette.accent])
              )(themePalette.surface === "light" ? 1 : 0.8);
              style.fontWeight = 800;
              style.textShadow =
                themePalette.surface === "light" ? "none" : undefined;
              style.transform =
                `${style.transform ?? ""} scale(${themePalette.surface === "light" ? 1.04 : 1.03})`.trim();
            }
            return <Word key={wordIndex} text={word} style={style} />;
          })}
        </div>
      ))}
    </div>
  );
};
