import React from "react";
import { DemoStage } from "../DemoStage";
import { SafeAreaGuides, WindowTimeline } from "./index";
import fixture from "./fixture.json";
import type { OverlayTextZone } from "../types";

// Studio: Components/SafeArea. Guides + a sample window timeline.
export const SafeAreaDemo: React.FC = () => (
  <DemoStage>
    <SafeAreaGuides
      safeArea={fixture.safeArea}
      textZones={fixture.textZones as OverlayTextZone[]}
      faceZones={fixture.faceZones}
    />
    <WindowTimeline
      items={[
        { label: "hook", window: { startFrame: 0, endFrame: 90 }, position: "top" },
        { label: "caption 1", window: { startFrame: 100, endFrame: 150 }, position: "top" },
      ]}
    />
  </DemoStage>
);
