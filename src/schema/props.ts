import { z } from "zod";

export const compositionProps = z.object({
  videoSrc: z.string(),
  captionsSrc: z.string(),
  theme: z.enum(["karaoke", "wordPop"]),
  mode: z.enum(["burn", "alpha"]),
  // Shifts every caption timestamp globally — fixes sync drift without
  // re-editing the JSON.
  offsetMs: z.number().int().min(-1000).max(1000),
  fontScale: z.number().min(0.7).max(1.4),
  safeAreaBottomPct: z.number().min(5).max(40),
  debug: z.boolean(),
});

export type CompositionProps = z.infer<typeof compositionProps>;

export const defaultProps: CompositionProps = {
  videoSrc: "video.mp4",
  captionsSrc: "captions.json",
  theme: "karaoke",
  mode: "burn",
  offsetMs: 0,
  fontScale: 1,
  safeAreaBottomPct: 18,
  debug: false,
};
