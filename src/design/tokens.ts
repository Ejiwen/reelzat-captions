// Single source of truth for colour, type, spacing and motion.
// Nothing outside this folder defines a colour or a spring.

export const palette = {
  navy: "#0B1F3A",
  sky: "#38BDF8",
  cyan: "#22D3EE",
  ink: "#F8FAFC",
  muted: "#94A3B8",
} as const;

// One easing family across the entire project.
export const springs = {
  enter: { damping: 14, mass: 0.6, stiffness: 120 },
  exit: { damping: 20, mass: 0.5, stiffness: 160 },
} as const;

export const typeScale = {
  // Base caption size relative to composition width; multiplied by fontScale.
  baseSizePx: (compositionWidth: number) => compositionWidth * 0.048,
  // Diacritics (shadda, damma) clip below 1.7.
  lineHeight: 1.7,
  fontWeight: 700 as const,
  // fitText may shrink a long segment down to this fraction of base — never further.
  minFitScale: 0.75,
};

export const spacing = {
  // Fraction of composition width a caption line may occupy.
  maxLineWidthFraction: 0.86,
  wordGapEm: 0.35,
  // Vertical room for diacritics above/below the line box.
  linePaddingBlockEm: 0.15,
};

export const motion = {
  // Numeric limits from the motion principles — themes must stay inside them.
  wordTransitionFrames: 4,
  staggerFrames: 3, // must stay within 2–4
  popTranslatePx: 28, // must stay within 20–40
  popScaleFrom: 0.94, // never below
  karaokeActiveScale: 1.06,
  segmentExitFrames: 6,
};

export const scrim = {
  gradient:
    "linear-gradient(to top, rgba(11,31,58,0.55) 0%, rgba(11,31,58,0.25) 45%, transparent 100%)",
  // The scrim occupies the bottom (safeAreaBottomPct + 20)% of frame height.
  extraHeightPct: 20,
};

export const textShadow = "0 2px 12px rgba(0,0,0,0.45)";
