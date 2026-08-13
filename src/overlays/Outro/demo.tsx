import React from "react";
import { AbsoluteFill } from "remotion";
import { useFontGate } from "../../design/fonts";
import { Outro } from "./index";

export const OutroDemo: React.FC = () => {
  useFontGate();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #b9aa92, #26384a 55%, #07101d)" }}>
      <Outro theme="culture" durationInFrames={180} />
    </AbsoluteFill>
  );
};
