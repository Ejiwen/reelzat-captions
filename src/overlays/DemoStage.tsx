import React from "react";
import { AbsoluteFill } from "remotion";
import { useFontGate } from "../design/fonts";
import { palette } from "../design/tokens";

// Shared scaffold for the per-component demos under the Studio "Components"
// folder: a dark stage (so light text reads) + the font gate. Demos exist to
// preview and tune one overlay in isolation — they never ship.
export const DemoStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useFontGate();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${palette.navy} 0%, #16324f 55%, #0a1626 100%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
