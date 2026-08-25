import type { HookBgTheme } from "../HookBg/themes";

// Featured owns a luminous hook, but its persistent identity rail should stay
// quiet over the guest. Reuse social rather than inventing a competing pearl
// card treatment.
export const nameplateThemeFor = (
  theme: HookBgTheme | undefined,
): HookBgTheme | undefined => (theme === "featured" ? "social" : theme);
