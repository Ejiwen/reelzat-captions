import { z } from "zod";
import { motionSpecSchema } from "../motion";
import { HOOK_BG_THEMES } from "../overlays/HookBg/themes";

// Studio props for the per-reel compositions. Identity (packageDir/clipId)
// comes from the generated manifest; everything else is a live control.

export const authoredReelProps = z.object({
  packageDir: z.string(),
  clipId: z.string(),
  mode: z.enum(["burn", "alpha"]),
  // Additionally show ASR words as small subtitles under the authored
  // overlays. Off by default.
  asrSubtitles: z.boolean(),
  fontScale: z.number().min(0.7).max(1.4),
  // Override the per-overlay animation defaults from Studio.
  hookAnimation: motionSpecSchema.nullable(),
  captionAnimation: motionSpecSchema.nullable(),
  // Studio override for the HookBg editorial theme. null → the package's
  // hook.backgroundTheme, then keyword fallback, then the configured default.
  hookBgTheme: z.enum(HOOK_BG_THEMES).nullable(),
  // Words template only: reveal each word at its onset (default) or show
  // the whole phrase and highlight the spoken word. null → config default.
  captionWordsMode: z.enum(["reveal", "phrase"]).nullable(),
  reduced: z.boolean(),
  debug: z.boolean(),
});
export type AuthoredReelProps = z.infer<typeof authoredReelProps>;

export const defaultAuthoredReelProps: Omit<AuthoredReelProps, "packageDir" | "clipId"> = {
  mode: "burn",
  asrSubtitles: false,
  fontScale: 1,
  hookAnimation: null,
  captionAnimation: null,
  hookBgTheme: null,
  captionWordsMode: null,
  reduced: false,
  debug: false,
};

export const asrCaptionedProps = z.object({
  packageDir: z.string(),
  clipId: z.string(),
  theme: z.enum(["karaoke", "wordPop"]),
  mode: z.enum(["burn", "alpha"]),
  offsetMs: z.number().int().min(-1000).max(1000),
  fontScale: z.number().min(0.7).max(1.4),
  // null → use the package's own safeArea.bottomPct.
  safeAreaBottomPct: z.number().min(5).max(40).nullable(),
  reduced: z.boolean(),
  debug: z.boolean(),
});
export type AsrCaptionedProps = z.infer<typeof asrCaptionedProps>;

export const defaultAsrCaptionedProps: Omit<AsrCaptionedProps, "packageDir" | "clipId"> = {
  theme: "karaoke",
  mode: "burn",
  offsetMs: 0,
  fontScale: 1,
  safeAreaBottomPct: null,
  reduced: false,
  debug: false,
};
