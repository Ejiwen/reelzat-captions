import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "../../captions/Word";
import { fadeToNeutralOklch } from "../../design/colour";
import { fontFamily, reelTypography } from "../../design/fonts";
import { spacing, typeScale } from "../../design/tokens";
import type { ResolvedAuthoredCaption } from "../../ingest/resolve";
import { tokenizeLine } from "../../schema/captions";
import { isAuthoredWordEmphasised } from "../CaptionLines";
import {
  captionAvailableWidthPx,
  captionTextMaxHeightPx,
} from "../CaptionEnergy/math";
import {
  captionLineBoxEm,
  captionWordUnitWidth,
  measureCaptionLayout,
} from "../captionLayout";
import { captionPlacementStyle } from "../captionSplitPlacement";
import { hookBgPalettes, type HookBgTheme } from "../HookBg/themes";
import { hookConfig } from "../Hook/config";
import { OverlayRoot } from "../OverlayRoot";
import { progressBarConfig } from "../ProgressBar/config";
import { captionBottomOffsetAboveProgressPx } from "../ProgressBar/math";
import { DEFAULT_SAFE_AREA, type OverlayBaseProps } from "../types";
import {
  captionWordsConfig,
  type CaptionWordsConfig,
  type CaptionWordsRevealMode,
} from "./config";
import {
  framesFromSeconds,
  groupPresenceAtFrame,
  hasUsableWordTiming,
  wordEntranceFrames,
  wordEntranceProgress,
  wordStateAtFrame,
  wordsGroupIndexAtFrame,
  type WordFrameTiming,
  type WordState,
} from "./math";

export {
  wordsCaptionPairAtFrame,
  wordsReaderWindow,
  type WordsCaptionPair,
} from "./math";
export { captionWordsConfig, type CaptionWordsConfig } from "./config";

export type CaptionWordsProps = OverlayBaseProps & {
  captions: ResolvedAuthoredCaption[];
  theme?: HookBgTheme;
  // Studio/package override of config.revealMode.
  revealMode?: CaptionWordsRevealMode | null;
  config?: Partial<CaptionWordsConfig>;
};

// ---------------------------------------------------------------------------
// Layout. Computed ONCE per group from measured glyph widths, never per
// frame: every word is in the DOM from the group's first frame with its final
// position, and reveals only change opacity/transform. The plate is sized
// from the same measurement so it never resizes as words appear.

type GroupLayout = {
  caption: ResolvedAuthoredCaption;
  lines: string[][];
  fontSize: number;
  plateWidthPx: number;
  // Flat token index → timing, or null when the group has no usable
  // alignment (renders as a static phrase, no active word).
  timings: WordFrameTiming[] | null;
  // True when timing exists but was synthesised upstream — shown as a phrase
  // rather than passed off as a spoken-word alignment.
  synthesized: boolean;
};

const layoutGroup = ({
  caption,
  width,
  fontScale,
  maxTextWidthPx,
  maxTextHeightPx,
  cfg,
}: {
  caption: ResolvedAuthoredCaption;
  width: number;
  fontScale: number;
  maxTextWidthPx: number;
  maxTextHeightPx: number;
  cfg: CaptionWordsConfig;
}): GroupLayout => {
  const px = width / 1080;
  const authoredLines = caption.lines.map(tokenizeLine);
  const tokens = authoredLines.flat();
  const baseFontSize =
    width *
    (caption.verse ? cfg.verseFontSizeFactor : cfg.fontSizeFactor) *
    fontScale;
  // The active word scales by cfg.activeScale around its centre; reserve that
  // growth in the fitted width so the widest line never touches the plate.
  const scaleSlack = Math.max(1, cfg.activeScale);
  const layout = measureCaptionLayout({
    lines: caption.verse ? authoredLines : [tokens],
    baseFontSize,
    maxTextWidthPx: maxTextWidthPx / scaleSlack,
    maxTextHeightPx,
    maxLineCount: caption.verse
      ? authoredLines.length
      : Math.max(1, cfg.maxLineCount),
    preserveLines: caption.verse,
  });
  const widestEm = layout.lines.reduce((max, line) => {
    const em =
      line.reduce((sum, word) => sum + captionWordUnitWidth(word), 0) +
      Math.max(0, line.length - 1) * spacing.wordGapEm;
    return Math.max(max, em);
  }, 0);
  const synthesized = caption.wordTimingSynthesized === true;
  const timings =
    !synthesized && hasUsableWordTiming(caption.words, tokens.length)
      ? caption.words.map(({ startFrame, endFrame }) => ({
          startFrame,
          endFrame,
        }))
      : null;
  return {
    caption,
    lines: layout.lines,
    fontSize: layout.fontSize,
    plateWidthPx:
      widestEm * layout.fontSize * scaleSlack + cfg.platePaddingInlinePx * px * 2,
    timings,
    synthesized,
  };
};

// ---------------------------------------------------------------------------
// Per-word styling. Only opacity, color, text-shadow and transform change —
// font weight and size are constant across states, so a state change can
// never move a neighbour.

type WordVisual = {
  frame: number;
  fps: number;
  timing: WordFrameTiming | null;
  state: WordState;
  isEmphasised: boolean;
  revealMode: CaptionWordsRevealMode;
  ink: string;
  mutedInk: string;
  accent: string;
  fontSize: number;
  lightSurface: boolean;
  reduced: boolean;
  cfg: CaptionWordsConfig;
};

const wordVisualStyle = ({
  frame,
  fps,
  timing,
  state,
  isEmphasised,
  revealMode,
  ink,
  mutedInk,
  accent,
  fontSize,
  lightSurface,
  reduced,
  cfg,
}: WordVisual): React.CSSProperties => {
  const intensity = reduced ? 0 : Math.max(0, Math.min(1, cfg.motionIntensity));
  // Emphasis keeps the accent hue and only loses some chroma towards the
  // ink — never a generic OKLCH mix, which drifts through green between
  // white and gold.
  const emphasisInk = lightSurface
    ? accent
    : fadeToNeutralOklch(accent, ink, 0.3);
  const restingInk = isEmphasised ? emphasisInk : ink;
  const shadow = lightSurface
    ? "none"
    : `0 ${(fontSize * 0.04).toFixed(1)}px ${(fontSize * 0.16).toFixed(1)}px rgba(0,0,0,0.55)`;

  // Static phrase (no usable timing): the group is simply present.
  if (!timing) {
    return { color: restingInk, opacity: 1, textShadow: shadow };
  }

  if (state === "upcoming") {
    return revealMode === "reveal"
      ? { opacity: 0, color: restingInk, transform: "translateY(0)" }
      : { opacity: 0.42, color: mutedInk, textShadow: shadow };
  }

  const entranceFrames = wordEntranceFrames(timing, fps, cfg.wordEnterSeconds);
  const entrance = interpolate(
    wordEntranceProgress(frame, timing, entranceFrames),
    [0, 1],
    [0, 1],
    { easing: Easing.out(Easing.cubic) },
  );
  // Reveal: present from the onset frame, finishing its short rise within
  // the word's own duration. Phrase: the word is already visible; the
  // entrance only lifts it from muted to full.
  const revealOpacity =
    revealMode === "reveal" ? 0.55 + 0.45 * entrance : 0.42 + 0.58 * entrance;
  const rise = revealMode === "reveal" ? (1 - entrance) * fontSize * 0.12 * intensity : 0;

  if (state === "active") {
    const scale = 1 + (cfg.activeScale - 1) * intensity * entrance;
    const glowAlpha = lightSurface ? 0 : 0.28 + 0.3 * entrance;
    return {
      color: fadeToNeutralOklch(
        accent,
        restingInk,
        1 - Math.min(1, 0.35 + 0.65 * entrance),
      ),
      opacity: revealOpacity,
      transform: `translateY(${rise.toFixed(2)}px) scale(${scale.toFixed(4)})`,
      textShadow: lightSurface
        ? "none"
        : [
            `0 0 ${(fontSize * 0.22).toFixed(1)}px rgba(242,201,76,${glowAlpha.toFixed(2)})`,
            shadow,
          ].join(", "),
    };
  }

  // Spoken: settled ink, no glow. Semantic emphasis keeps its accent tint —
  // that is meaning, not speech activity.
  return {
    color: restingInk,
    opacity: revealOpacity,
    transform: `translateY(${rise.toFixed(2)}px)`,
    textShadow: shadow,
  };
};

// ---------------------------------------------------------------------------

export const CaptionWords: React.FC<CaptionWordsProps> = ({
  captions,
  window,
  position,
  direction,
  animation,
  safeArea,
  textZone,
  splitWindows = [],
  fontScale = 1,
  reduced = false,
  theme,
  revealMode,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cfg: CaptionWordsConfig = useMemo(
    () => ({ ...captionWordsConfig, ...(config ?? {}) }),
    [config],
  );
  const mode: CaptionWordsRevealMode = revealMode ?? cfg.revealMode;
  const px = width / 1080;
  const resolvedSafeArea = safeArea ?? DEFAULT_SAFE_AREA;
  const palette =
    hookBgPalettes[
      theme ??
        hookConfig.background.themeOverride ??
        hookConfig.background.defaultTheme
    ];
  const lightSurface = palette.surface === "light";
  const accent = cfg.accent ?? palette.accent;

  const bottomOffsetPx =
    position === "bottom"
      ? captionBottomOffsetAboveProgressPx({
          width,
          height,
          safeAspectRatio: progressBarConfig.facebookSafeAspectRatio,
          safeAreaInsetPx: progressBarConfig.safeAreaInsetPx,
          ringSizePx: progressBarConfig.ringSizePx,
          clearancePx: progressBarConfig.captionClearancePx,
        }) +
        cfg.bottomClearancePx * px
      : undefined;
  const maxTextWidthPx = Math.max(
    1,
    captionAvailableWidthPx({ width, safeArea: resolvedSafeArea, textZone }) -
      (cfg.safeInsetPx + cfg.platePaddingInlinePx) * px * 2,
  );
  const maxTextHeightPx = captionTextMaxHeightPx({
    height,
    bottomOffsetPx:
      bottomOffsetPx ?? height - (height * resolvedSafeArea.topPct) / 100,
    topLimitPct: position === "bottom" ? 50 : 0,
    paddingBlockPx: cfg.platePaddingBlockPx * px,
  });

  // One layout per group for the whole reel. Fonts are loaded before the
  // composition renders (useReelPackage / useFontGate), so measurement here
  // is exact and stable across frames.
  const layouts = useMemo(
    () =>
      captions.map((caption) =>
        layoutGroup({
          caption,
          width,
          fontScale,
          maxTextWidthPx,
          maxTextHeightPx,
          cfg,
        }),
      ),
    [captions, width, fontScale, maxTextWidthPx, maxTextHeightPx, cfg],
  );

  if (frame < window.startFrame || frame >= window.endFrame) {
    return null;
  }
  const groupIndex = wordsGroupIndexAtFrame(captions, frame);
  const group = layouts[groupIndex];
  if (!group) {
    return null;
  }

  const enterFrames = Math.max(1, Math.round((cfg.groupEnterFrames / 30) * fps));
  const exitFrames = Math.max(1, Math.round((cfg.groupExitFrames / 30) * fps));
  const presence = reduced
    ? 1
    : groupPresenceAtFrame(
        frame,
        group.caption.window,
        enterFrames,
        exitFrames,
      );
  const maxActiveHoldFrames = framesFromSeconds(cfg.maxActiveHoldSeconds, fps);
  const placementStyle =
    bottomOffsetPx !== undefined && splitWindows.length > 0
      ? captionPlacementStyle({
          frame,
          fps,
          height,
          safeArea: resolvedSafeArea,
          bottomOffsetPx,
          windows: splitWindows,
          reduced,
        })
      : undefined;

  const plateBackground = lightSurface
    ? `rgba(247, 244, 238, ${Math.min(1, cfg.plateOpacity + 0.24).toFixed(2)})`
    : `rgba(6, 10, 18, ${cfg.plateOpacity.toFixed(2)})`;
  const plateHeightPx =
    group.lines.length * captionLineBoxEm * group.fontSize +
    cfg.platePaddingBlockPx * px * 2;

  let flatIndex = -1;

  return (
    <OverlayRoot
      window={group.caption.window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={resolvedSafeArea}
      textZone={textZone}
      bottomOffsetPx={bottomOffsetPx}
      placementStyle={placementStyle}
      reduced={reduced}
    >
      <div
        style={{
          position: "relative",
          width: group.plateWidthPx,
          minHeight: plateHeightPx,
          padding: `${cfg.platePaddingBlockPx * px}px ${cfg.platePaddingInlinePx * px}px`,
          boxSizing: "border-box",
          borderRadius: cfg.plateRadiusPx * px,
          background: plateBackground,
          boxShadow: lightSurface
            ? `0 ${6 * px}px ${24 * px}px rgba(16,38,62,0.18)`
            : `0 ${8 * px}px ${28 * px}px rgba(0,0,0,0.28)`,
          opacity: presence,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          direction,
          textAlign: "center",
          fontFamily,
          fontWeight: reelTypography.caption,
          fontSize: group.fontSize,
          lineHeight: typeScale.lineHeight,
          color: palette.foreground,
        }}
      >
        {group.caption.verse ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: "18%",
              bottom: "18%",
              width: 4 * px,
              borderRadius: 999,
              background: accent,
              opacity: 0.85,
            }}
          />
        ) : null}
        {group.lines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            style={{
              display: "flex",
              flexWrap: "nowrap",
              justifyContent: "center",
              direction,
              columnGap: `${spacing.wordGapEm}em`,
              paddingBlock: `${spacing.linePaddingBlockEm}em`,
            }}
          >
            {line.map((word, wordIndex) => {
              flatIndex += 1;
              const timing = group.timings?.[flatIndex] ?? null;
              const state = timing
                ? wordStateAtFrame(frame, timing, maxActiveHoldFrames)
                : "spoken";
              const style = wordVisualStyle({
                frame,
                fps,
                timing,
                state,
                isEmphasised: isAuthoredWordEmphasised(
                  word,
                  group.caption.emphasis,
                ),
                revealMode: mode,
                ink: palette.foreground,
                mutedInk: palette.mutedForeground,
                accent,
                fontSize: group.fontSize,
                lightSurface,
                reduced,
                cfg,
              });
              return <Word key={wordIndex} text={word} style={style} />;
            })}
          </div>
        ))}
      </div>
    </OverlayRoot>
  );
};
