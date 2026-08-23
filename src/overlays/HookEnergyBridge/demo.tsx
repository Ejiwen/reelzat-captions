import React from "react";
import { AbsoluteFill } from "remotion";
import { useFontGate } from "../../design/fonts";
import { Hook } from "../Hook";
import type { HookBgTheme } from "../HookBg/themes";
import { ProgressBar } from "../ProgressBar";
import { HookEnergyBridge } from "./index";

// Studio: Components/HookEnergyBridge-Demo (+ one per theme). Shows the full
// sequence on one screen: Wazin circle at its REAL computed position, source
// ignition → travel → arrival → HookBg resolve → stable hold → return pulse,
// with a realistic Arabic hook over bright and dark video-like regions.

const demoWindow = { startFrame: 12, endFrame: 172 };

const demoHooks: Record<HookBgTheme, string> = {
  politics: "قبل ٣٠ عاماً تنبّأ بمصير السودان",
  religion: "آيةٌ واحدة غيّرت حياته كلّها",
  culture: "بيتُ شعرٍ واحد خلّده التاريخ",
  general: "أربع دول خرجت من دولة واحدة",
  social: "قصة عائلة بدأت من رسالة واحدة",
  featured: "لحظة استثنائية تستحق أن تُروى",
};

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    <Stage>
      <ProgressBar direction="rtl" />
      <Hook
        data={{ text: demoHooks[theme], backgroundTheme: theme }}
        window={demoWindow}
        position="top"
        direction="rtl"
      />
      <HookEnergyBridge window={demoWindow} theme={theme} />
    </Stage>
  );
  Demo.displayName = `HookEnergy${theme[0]!.toUpperCase()}${theme.slice(1)}Demo`;
  return Demo;
};

// The general demo doubles as the canonical HookEnergyBridge-Demo.
export const HookEnergyGeneralDemo = themeDemo("general");
export const HookEnergyPoliticsDemo = themeDemo("politics");
export const HookEnergyReligionDemo = themeDemo("religion");
export const HookEnergyCultureDemo = themeDemo("culture");
export const HookEnergySocialDemo = themeDemo("social");
export const HookEnergyFeaturedDemo = themeDemo("featured");
