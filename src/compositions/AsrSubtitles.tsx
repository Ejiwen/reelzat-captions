import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../design/fonts";
import { palette, textShadow, typeScale } from "../design/tokens";
import { msToFrame } from "../captions/useActiveSegment";
import type { WordTiming } from "../schema/captions";

// Optional small subtitles from ASR word timing, shown UNDER the authored
// overlays (asrSubtitles prop, off by default). Deliberately quiet: rolling
// 4-word chunks, small type, plain 3-frame cross-fade — they must never
// compete with the authored captions.

const CHUNK_SIZE = 4;
const FADE_FRAMES = 3;

export const AsrSubtitles: React.FC<{
  words: WordTiming[];
  direction: "rtl" | "ltr";
  // Baseline as % of frame height — sits below the caption band.
  bottomPct: number;
  fontScale?: number;
}> = ({ words, direction, bottomPct, fontScale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const chunks = useMemo(() => {
    const out: { text: string; startMs: number; endMs: number }[] = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      const slice = words.slice(i, i + CHUNK_SIZE);
      out.push({
        text: slice.map((w) => w.text).join(" "),
        startMs: slice[0]!.startMs,
        endMs: slice[slice.length - 1]!.endMs,
      });
    }
    return out;
  }, [words]);

  const active = chunks.find(
    (c) => frame >= msToFrame(c.startMs, fps) && frame < msToFrame(c.endMs, fps),
  );
  if (!active) {
    return null;
  }

  const startFrame = msToFrame(active.startMs, fps);
  const endFrame = msToFrame(active.endMs, fps);
  const opacity = Math.min(
    interpolate(frame, [startFrame, startFrame + FADE_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [endFrame - FADE_FRAMES, endFrame], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <div
      style={{
        position: "absolute",
        insetInline: "7%",
        bottom: `${bottomPct}%`,
        textAlign: "center",
        direction,
        fontFamily,
        fontWeight: 500,
        fontSize: width * 0.03 * fontScale,
        lineHeight: typeScale.lineHeight,
        color: palette.muted,
        textShadow,
        opacity,
        pointerEvents: "none",
      }}
    >
      {active.text}
    </div>
  );
};
