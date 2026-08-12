import React from "react";
import { useVideoConfig } from "remotion";
import { palette } from "../../design/tokens";
import { progressBarConfig } from "./config";
import { ProgressBar } from "./index";
import { facebookSafeRegionBottomPx } from "./math";

export const ProgressBarDemo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const safeBottom = facebookSafeRegionBottomPx(
    width,
    height,
    progressBarConfig.facebookSafeAspectRatio,
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: `radial-gradient(circle at 25% 28%, rgba(248,250,252,0.34), transparent 26%), radial-gradient(circle at 78% 68%, rgba(56,189,248,0.22), transparent 30%), linear-gradient(155deg, ${palette.navy}, #28435e 50%, #07111f)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: safeBottom,
          left: 0,
          right: 0,
          borderTop: `2px dashed ${palette.gold}`,
          opacity: 0.58,
        }}
      />
      <ProgressBar direction="rtl" />
    </div>
  );
};
