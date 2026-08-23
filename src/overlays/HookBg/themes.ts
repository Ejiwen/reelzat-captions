// The five editorial HookBg themes and their resolution rules.
//
// This module is deliberately PURE (no React, no Remotion): src/ingest/ can
// validate a package's `hook.backgroundTheme` against the same canonical list
// the component renders with, and tests can exercise resolution directly.
//
// Theme names describe editorial meaning, never colour. Most palettes are
// dark, desaturated solid-colour families. `featured` is the deliberate
// exception: a luminous pearl surface with its own dark ink contract.

export const HOOK_BG_THEMES = [
  "politics",
  "religion",
  "culture",
  "general",
  "social",
  "featured",
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
  // Semantic typography colours. Light palettes must never inherit the
  // project's default white ink by accident.
  foreground: string;
  mutedForeground: string;
  accent: string;
  surface: "dark" | "light";
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
    foreground: "#F8FAFC",
    mutedForeground: "#CBD5E1",
    accent: "#F2C94C",
    surface: "dark",
  },
  // Emerald and forest green over near-black green, with restrained gold
  // light — calm and dignified.
  religion: {
    base: "#071510",
    primary: "#14532D",
    secondary: "#0B3B33",
    highlight: "#C9A44E",
    vignette: "#030906",
    foreground: "#F8FAFC",
    mutedForeground: "#CBD5E1",
    accent: "#F2C94C",
    surface: "dark",
  },
  // Indigo and plum with muted gold — literature, poetry, history,
  // philosophy. Elegant rather than theatrical.
  culture: {
    base: "#130E21",
    primary: "#3B2A6B",
    secondary: "#5B2A55",
    highlight: "#C7A45C",
    vignette: "#090714",
    foreground: "#F8FAFC",
    mutedForeground: "#CBD5E1",
    accent: "#F2C94C",
    surface: "dark",
  },
  // The project's native navy/cyan identity, deepened.
  general: {
    base: "#081527",
    primary: "#0B1F3A",
    secondary: "#155E75",
    highlight: "#7DD3FC",
    vignette: "#040B15",
    foreground: "#F8FAFC",
    mutedForeground: "#CBD5E1",
    accent: "#F2C94C",
    surface: "dark",
  },
  // Warm amber, burnt orange and terracotta over deep brown — human and
  // conversational, never influencer-loud.
  social: {
    base: "#1C1108",
    primary: "#A34A10",
    secondary: "#8A3416",
    highlight: "#E8B15C",
    vignette: "#100904",
    foreground: "#F8FAFC",
    mutedForeground: "#CBD5E1",
    accent: "#F2C94C",
    surface: "dark",
  },
  // White pearl, cool silver and a restrained lilac/champagne iridescence.
  // Dark navy ink keeps the treatment readable over the luminous surface;
  // the deep berry accent is deliberately darker than the pearl so authored
  // emphasis never disappears into the cyan/lilac highlights.
  featured: {
    base: "#E7EEF4",
    primary: "#9BD5E1",
    secondary: "#C8BCE7",
    highlight: "#FFFCF8",
    vignette: "#334B63",
    foreground: "#10263E",
    mutedForeground: "#39566E",
    accent: "#7A315D",
    surface: "light",
  },
};

// ---------------------------------------------------------------------------
// Resolution

// Narrow an untrusted value (package field, Studio prop) to a known theme.
// Unknown or missing values return null — a typo in a package must degrade
// to the fallback chain, never fail the reel.
export const parseHookBgTheme = (value: unknown): HookBgTheme | null =>
  typeof value === "string" &&
  (HOOK_BG_THEMES as readonly string[]).includes(value)
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
export const resolveHookBgTheme = ({
  explicit,
  text,
  fallback,
}: HookBgThemeInput): HookBgTheme =>
  parseHookBgTheme(explicit) ??
  (text ? keywordThemeFor(text) : null) ??
  fallback;
