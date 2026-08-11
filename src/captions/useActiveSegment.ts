import { useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedSegment } from "../schema/captions";

export const msToFrame = (ms: number, fps: number): number => (ms / 1000) * fps;

export type ActiveSegment = {
  segment: ResolvedSegment;
  startFrame: number;
  endFrame: number;
  // 0..1 through the segment's duration.
  progress: number;
  // Index into the segment's flattened display words; -1 before the first word.
  activeWordIndex: number;
};

// Maps the current frame to the segment on screen. offsetMs shifts every
// caption timestamp globally (positive = captions appear later).
export const useActiveSegment = (
  segments: ResolvedSegment[],
  offsetMs: number,
): ActiveSegment | null => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  for (const segment of segments) {
    const startFrame = msToFrame(segment.startMs + offsetMs, fps);
    const endFrame = msToFrame(segment.endMs + offsetMs, fps);
    if (frame < startFrame || frame >= endFrame) {
      continue;
    }

    const words = segment.lines.flat();
    let activeWordIndex = -1;
    for (const [i, word] of words.entries()) {
      if (frame >= msToFrame(word.startMs + offsetMs, fps)) {
        activeWordIndex = i;
      }
    }

    return {
      segment,
      startFrame,
      endFrame,
      progress: (frame - startFrame) / (endFrame - startFrame),
      activeWordIndex,
    };
  }

  return null;
};
