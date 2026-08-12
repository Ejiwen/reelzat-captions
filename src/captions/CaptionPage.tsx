import { fitText } from "@remotion/layout-utils";
import { Trail } from "@remotion/motion-blur";
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily, reelTypography } from "../design/fonts";
import { spacing, textShadow, typeScale } from "../design/tokens";
import type { Theme } from "../themes";
import { msToFrame, type ActiveSegment } from "./useActiveSegment";
import { Word } from "./Word";

type PageProps = {
  active: ActiveSegment;
  theme: Theme;
  offsetMs: number;
  fontScale: number;
  safeAreaBottomPct: number;
};

// Renders one segment (one caption page) and delegates all styling decisions
// to the theme. Layout rules that keep Arabic stable:
//  - every word of the segment is in the DOM from the segment's first frame
//  - direction: rtl on every text container, centre-aligned
//  - lineHeight >= 1.7 plus paddingBlock so diacritics never clip
export const CaptionPage: React.FC<PageProps> = (props) => {
  const frame = useCurrentFrame();
  const { theme, active } = props;

  // Motion blur only where the theme asks for it, and only during the entry
  // window — it is expensive and adds nothing to a static line. Trail shifts
  // time for its children, so all frame-dependent styling lives in
  // PageContent, which reads useCurrentFrame itself.
  if (theme.trail && frame < active.startFrame + theme.trail.entryWindowInFrames) {
    return (
      <Trail
        layers={theme.trail.layers}
        lagInFrames={theme.trail.lagInFrames}
        trailOpacity={theme.trail.trailOpacity}
      >
        <PageContent {...props} />
      </Trail>
    );
  }

  return <PageContent {...props} />;
};

const PageContent: React.FC<PageProps> = ({
  active,
  theme,
  offsetMs,
  fontScale,
  safeAreaBottomPct,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { segment, startFrame, endFrame, activeWordIndex } = active;

  const baseSize = typeScale.baseSizePx(width) * fontScale;
  const maxLineWidth = width * spacing.maxLineWidthFraction;

  // Auto-shrink a segment whose longest line would overflow, clamped to
  // [0.75×, 1×] of the base size. Measured once per segment, not per frame.
  const fontSize = useMemo(() => {
    let size = baseSize;
    for (const line of segment.lines) {
      const text = line.map((w) => w.text).join(" ");
      const fitted = fitText({
        text,
        withinWidth: maxLineWidth,
        fontFamily,
        fontWeight: reelTypography.caption,
      });
      size = Math.min(size, fitted.fontSize);
    }
    return Math.max(size, baseSize * typeScale.minFitScale);
  }, [segment, baseSize, maxLineWidth]);

  let flatIndex = -1;

  return (
    <div
      style={{
        position: "absolute",
        insetInline: `${((1 - spacing.maxLineWidthFraction) / 2) * 100}%`,
        bottom: (safeAreaBottomPct / 100) * height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        direction: "rtl",
        textAlign: "center",
        fontFamily,
        fontWeight: reelTypography.caption,
        fontSize,
        lineHeight: typeScale.lineHeight,
        textShadow,
        ...theme.containerStyle,
        ...theme.renderContainer?.({
          frame,
          fps,
          segmentStartFrame: startFrame,
          segmentEndFrame: endFrame,
        }),
      }}
    >
      {segment.lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            direction: "rtl",
            columnGap: `${spacing.wordGapEm}em`,
            paddingBlock: `${spacing.linePaddingBlockEm}em`,
          }}
        >
          {line.map((word, wordIndex) => {
            flatIndex += 1;
            const index = flatIndex;
            const style = theme.renderWord({
              word,
              index,
              isActive: index === activeWordIndex,
              isPast: index < activeWordIndex,
              isEmphasised: (segment.emphasis ?? []).includes(index),
              frame,
              fps,
              segmentStartFrame: startFrame,
              segmentEndFrame: endFrame,
              wordStartFrame: msToFrame(word.startMs + offsetMs, fps),
              wordEndFrame: msToFrame(word.endMs + offsetMs, fps),
            });
            return <Word key={wordIndex} text={word.text} style={style} />;
          })}
        </div>
      ))}
    </div>
  );
};
