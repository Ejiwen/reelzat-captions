import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { hookConfig } from "../Hook/config";
import { DemoStage } from "../DemoStage";
import { HookBg } from "./index";

export const HookBgDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const exitProgress = interpolate(frame, [135, 165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <DemoStage>
      <HookBg
        windowStartFrame={15}
        exitProgress={exitProgress}
        settings={hookConfig.background}
      />
    </DemoStage>
  );
};
