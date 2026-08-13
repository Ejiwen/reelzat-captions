import React from "react";
import { AbsoluteFill } from "remotion";
import { useFontGate } from "../../design/fonts";
import { Hook } from "../Hook";
import type { HookBgTheme } from "./themes";

// Studio: Components/HookBg-<Theme>. One composition per editorial theme so
// each palette can be inspected in isolation across all three phases
// (entrance ≈ frames 12–30, stable reading, exit ≈ last second).
//
// The stage imitates a video frame with BOTH bright and dark regions crossing
// the hook band — the hard case for text contrast. The real Hook component is
// used (not a bare HookBg) so the gold word entrance, shimmer and underline
// are checked against every palette exactly as they ship.

const demoWindow = { startFrame: 12, endFrame: 172 };

// Realistic Arabic hooks, one per editorial register.
const demoHooks: Record<HookBgTheme, string> = {
  politics: "قبل ٣٠ عاماً تنبّأ بمصير السودان",
  religion: "آيةٌ واحدة غيّرت حياته كلّها",
  culture: "بيتُ شعرٍ واحد خلّده التاريخ",
  general: "أربع دول خرجت من دولة واحدة",
  social: "قصة عائلة بدأت من رسالة واحدة",
};

// Video-like backdrop: a bright warm highlight sweeping into deep shadow,
// diagonally crossing the hook band so every theme is checked over both.
const MockVideoStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useFontGate();
  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse 70% 42% at 22% 30%, rgba(244, 232, 208, 0.95) 0%, rgba(214, 186, 148, 0.6) 45%, transparent 75%),
          radial-gradient(ellipse 60% 38% at 82% 74%, rgba(6, 10, 18, 0.9) 0%, transparent 70%),
          linear-gradient(118deg, #cdbfa4 0%, #8e8b7e 32%, #4c5a66 58%, #202b38 80%, #0a111b 100%)
        `,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const themeDemo = (theme: HookBgTheme): React.FC => {
  const Demo: React.FC = () => (
    <MockVideoStage>
      <Hook
        data={{ text: demoHooks[theme], backgroundTheme: theme }}
        window={demoWindow}
        position="top"
        direction="rtl"
      />
    </MockVideoStage>
  );
  Demo.displayName = `HookBg${theme[0]!.toUpperCase()}${theme.slice(1)}Demo`;
  return Demo;
};

export const HookBgPoliticsDemo = themeDemo("politics");
export const HookBgReligionDemo = themeDemo("religion");
export const HookBgCultureDemo = themeDemo("culture");
export const HookBgGeneralDemo = themeDemo("general");
export const HookBgSocialDemo = themeDemo("social");
