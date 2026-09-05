// The words template: one authored phrase group at a time, revealed word by
// word from the real onset timestamps. Pixel values are authored at 1080px
// width and scale with the composition; seconds are converted to frames at
// the composition fps inside math.ts — never here.

export type CaptionWordsRevealMode =
  // Words are invisible until their onset (layout space is reserved), so the
  // pace of speech is the pace of the caption.
  | "reveal"
  // The whole phrase is visible from the group start; only the active word
  // is highlighted.
  | "phrase";

export type CaptionWordsConfig = {
  revealMode: CaptionWordsRevealMode;
  // Type size relative to composition width, multiplied by fontScale. Verse
  // uses a slightly quieter scale so two hemistichs share one plate.
  fontSizeFactor: number;
  verseFontSizeFactor: number;
  // null → the editorial HookBg theme's accent (gold on dark themes).
  accent: string | null;
  // Extra air above the ProgressBar ring, on top of the ring clearance.
  bottomClearancePx: number;
  // Air between the plate and the caption safe-area line, each side.
  safeInsetPx: number;
  platePaddingInlinePx: number;
  platePaddingBlockPx: number;
  plateRadiusPx: number;
  // Opacity of the compact backing plate (dark themes / the light featured
  // surface).
  plateOpacity: number;
  // Hard ceiling on rendered lines for prose. Verse keeps every authored
  // hemistich regardless.
  maxLineCount: number;
  // 0 → opacity-only reveals; 1 → the full (still restrained) movement.
  motionIntensity: number;
  // Word entrance length. Shorter words get a shorter entrance (never longer
  // than the word itself), and the word is visible from its onset frame.
  wordEnterSeconds: number;
  // Active-word treatment.
  activeScale: number;
  // Exported word windows are contiguous (each word ends where the next one
  // starts), so a long silence is attributed to the word spoken before it.
  // After this many seconds the active treatment settles to "spoken" so a
  // pause is not shown as a word still being said. Set to Infinity to trust
  // the windows literally.
  maxActiveHoldSeconds: number;
  // Group plate fade in/out (frames at 30fps; scaled with fps).
  groupEnterFrames: number;
  groupExitFrames: number;
};

export const captionWordsConfig: CaptionWordsConfig = {
  revealMode: "reveal",
  fontSizeFactor: 0.052,
  verseFontSizeFactor: 0.047,
  accent: null,
  bottomClearancePx: 10,
  safeInsetPx: 28,
  platePaddingInlinePx: 34,
  platePaddingBlockPx: 6,
  plateRadiusPx: 26,
  plateOpacity: 0.66,
  maxLineCount: 2,
  motionIntensity: 1,
  wordEnterSeconds: 0.14,
  activeScale: 1.04,
  maxActiveHoldSeconds: 1.1,
  groupEnterFrames: 4,
  groupExitFrames: 5,
};
