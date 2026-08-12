import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "../captions/Word";
import { fontFamily, reelTypography } from "../design/fonts";
import { palette, spacing, textShadow, typeScale } from "../design/tokens";
import { staggeredWordStyle } from "./wordStagger";

// Shared line renderer for CaptionShort / CaptionLong. Every word is in the
// DOM from the window's first frame (no layout shift); the stagger animates
// opacity + transform only, with a flat word index running across lines.
type CaptionLinesProps = {
  // Tokenized lines — the word is the smallest animatable unit.
  lines: string[][];
  fontSize: number;
  direction: "rtl" | "ltr";
  windowStartFrame: number;
  stagger: boolean;
  reduced?: boolean;
  wrap?: boolean;
};

export const CaptionLines: React.FC<CaptionLinesProps> = ({
  lines,
  fontSize,
  direction,
  windowStartFrame,
  stagger,
  reduced,
  wrap = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        color: palette.ink,
        textShadow,
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
            const style = stagger
              ? staggeredWordStyle({ frame, fps, index: flatIndex, windowStartFrame, reduced })
              : {};
            return <Word key={wordIndex} text={word} style={style} />;
          })}
        </div>
      ))}
    </div>
  );
};
