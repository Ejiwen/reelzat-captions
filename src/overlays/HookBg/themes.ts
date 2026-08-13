// The five editorial HookBg themes and their resolution rules.
//
// This module is deliberately PURE (no React, no Remotion): src/ingest/ can
// validate a package's `hook.backgroundTheme` against the same canonical list
// the component renders with, and tests can exercise resolution directly.
//
// Theme names describe editorial meaning, never colour. Every palette is a
// dark, desaturated solid-colour family: the hook's ink/gold typography is
// the bright element, the background stays subordinate.

export const HOOK_BG_THEMES = [
  "politics",
  "religion",
  "culture",
  "general",
  "social",
] as const;

export type HookBgTheme = (typeof HOOK_BG_THEMES)[number];

export type HookBgPalette = {
  // Darkest, most stable tone — carries text contrast.
  base: string;
  // The large primary gradient field.
  primary: string;
  // Softer complementary mass, offset from the primary.
  secondary: string;
  // Directional light-sweep colour (used at low opacity, screen-blended).
  highlight: string;
  // Edge-darkening tone.
  vignette: string;
};

// Exact palette values. All are deep enough that ink (#F8FAFC) exceeds
// WCAG-large contrast and the gold entrance (#F2C94C) stays clearly visible.
export const hookBgPalettes: Record<HookBgTheme, HookBgPalette> = {
  // Deep authoritative red/burgundy anchored by dark navy — serious and
  // analytical, never "breaking news" scarlet.
  politics: {
    base: "#190B12",
    primary: "#7E1B2C",
    secondary: "#132441",
    highlight: "#C4737C",
    vignette: "#070409",
  },
  // Emerald and forest green over near-black green, with restrained gold
  // light — calm and dignified.
  religion: {
    base: "#071510",
    primary: "#14532D",
    secondary: "#0B3B33",
    highlight: "#C9A44E",
    vignette: "#030906",
  },
  // Indigo and plum with muted gold — literature, poetry, history,
  // philosophy. Elegant rather than theatrical.
  culture: {
    base: "#130E21",
    primary: "#3B2A6B",
    secondary: "#5B2A55",
    highlight: "#C7A45C",
    vignette: "#090714",
  },
  // The project's native navy/cyan identity, deepened.
  general: {
    base: "#081527",
    primary: "#0B1F3A",
    secondary: "#155E75",
    highlight: "#7DD3FC",
    vignette: "#040B15",
  },
  // Warm amber, burnt orange and terracotta over deep brown — human and
  // conversational, never influencer-loud.
  social: {
    base: "#1C1108",
    primary: "#A34A10",
    secondary: "#8A3416",
    highlight: "#E8B15C",
    vignette: "#100904",
  },
};

// ---------------------------------------------------------------------------
// Resolution

// Narrow an untrusted value (package field, Studio prop) to a known theme.
// Unknown or missing values return null — a typo in a package must degrade
// to the fallback chain, never fail the reel.
export const parseHookBgTheme = (value: unknown): HookBgTheme | null =>
  typeof value === "string" && (HOOK_BG_THEMES as readonly string[]).includes(value)
    ? (value as HookBgTheme)
    : null;

// Deterministic keyword fallback, used ONLY when no explicit theme exists.
// Substring stems (Arabic first, English second) — no tokenisation, no
// external calls, same input → same output. Order = priority: the first
// theme with any matching stem wins; `general` is the terminal fallback and
// needs no keywords.
const KEYWORD_STEMS: readonly [HookBgTheme, readonly string[]][] = [
  [
    "politics",
    [
      "سياس", // سياسة/سياسي
      "حكوم", // حكومة/حكومي
      "حرب",
      "انتخاب",
      "السودان",
      "سلطة",
      "دولة",
      "برلمان",
      "نظام الحكم",
      "politic",
      "government",
      "war",
      "sudan",
      "election",
      "state",
      "power",
    ],
  ],
  [
    "religion",
    [
      "دين", // دين/ديني
      "إيمان",
      "ايمان",
      "قرآن",
      "قران",
      "عبادة",
      "أخلاق",
      "اخلاق",
      "فقه",
      "مسجد",
      "faith",
      "quran",
      "religio",
      "worship",
      "ethic",
    ],
  ],
  [
    "culture",
    [
      "أدب",
      "ادب",
      "شعر",
      "كتاب", // كتاب/كتب
      "كتب",
      "تاريخ",
      "فلسف", // فلسفة/فلسفي
      "تراث",
      "رواية",
      "literat",
      "poet",
      "book",
      "histor",
      "philosoph",
    ],
  ],
  [
    "social",
    [
      "أسرة",
      "اسرة",
      "عائل", // عائلة/عائلي
      "زواج",
      "علاق", // علاقة/علاقات
      "مجتمع",
      "أصدقاء",
      "اصدقاء",
      "قصة شخصية",
      "famil",
      "relationship",
      "society",
      "personal",
      "social",
    ],
  ],
];

export const keywordThemeFor = (text: string): HookBgTheme | null => {
  const haystack = text.toLowerCase();
  for (const [theme, stems] of KEYWORD_STEMS) {
    if (stems.some((stem) => haystack.includes(stem))) {
      return theme;
    }
  }
  return null;
};

export type HookBgThemeInput = {
  // Highest priority: an explicitly configured theme (Studio prop or the
  // package's hook.backgroundTheme). Unknown strings are ignored.
  explicit?: unknown;
  // Hook text (and optionally title) driving the keyword fallback.
  text?: string;
  // Terminal fallback — the configured defaultTheme.
  fallback: HookBgTheme;
};

// Priority: explicit theme → keyword fallback → configured default.
export const resolveHookBgTheme = ({ explicit, text, fallback }: HookBgThemeInput): HookBgTheme =>
  parseHookBgTheme(explicit) ?? (text ? keywordThemeFor(text) : null) ?? fallback;
