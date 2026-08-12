import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../../design/tokens";
import type { OverlaySafeArea, OverlayTextZone, OverlayWindow } from "../types";
import { DEFAULT_SAFE_AREA } from "../types";

// Debug-only guides — drawn by the `debug` prop, never in a normal render.
// Shows the safe-area bands, director text-safe zones / face zones, and a
// timeline of every overlay's window against the playhead.

export const SafeAreaGuides: React.FC<{
  safeArea?: OverlaySafeArea;
  textZones?: OverlayTextZone[];
  faceZones?: OverlayTextZone[];
}> = ({ safeArea = DEFAULT_SAFE_AREA, textZones = [], faceZones = [] }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Hook band (top) */}
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          top: `${safeArea.topPct}%`,
          borderTop: `2px dashed ${palette.sky}`,
        }}
      />
      {/* Caption band (bottom) */}
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: `${safeArea.bottomPct}%`,
          borderTop: `2px dashed ${palette.cyan}`,
        }}
      />
      {/* Side gutters */}
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          style={{
            position: "absolute",
            insetBlock: 0,
            [side]: `${safeArea.sidePct}%`,
            borderLeft: `1px dashed ${palette.muted}`,
            opacity: 0.6,
          }}
        />
      ))}
      {/* Director text-safe zones */}
      {textZones.map((zone, i) => (
        <div
          key={`text-${i}`}
          style={{
            position: "absolute",
            left: `${zone.xPct}%`,
            top: `${zone.yPct}%`,
            width: `${zone.wPct}%`,
            height: `${zone.hPct}%`,
            border: `2px solid ${palette.cyan}`,
            background: "rgba(34, 211, 238, 0.08)",
          }}
        />
      ))}
      {/* Director face zones — never cover these */}
      {faceZones.map((zone, i) => (
        <div
          key={`face-${i}`}
          style={{
            position: "absolute",
            left: `${zone.xPct}%`,
            top: `${zone.yPct}%`,
            width: `${zone.wPct}%`,
            height: `${zone.hPct}%`,
            border: "2px solid rgba(248, 113, 113, 0.9)",
            background: "rgba(248, 113, 113, 0.08)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export type TimelineItem = {
  label: string;
  window: OverlayWindow;
  position?: "top" | "bottom";
};

// Bottom-left panel: one bar per overlay window against the full duration,
// with the playhead marked. LTR on purpose — it is a dev instrument.
export const WindowTimeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const panelWidth = width * 0.42;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        width: panelWidth,
        padding: "12px 16px",
        background: "rgba(11,31,58,0.85)",
        borderRadius: 8,
        fontFamily: "monospace",
        fontSize: 22,
        color: palette.ink,
        direction: "ltr",
        pointerEvents: "none",
      }}
    >
      <div style={{ marginBottom: 8, color: palette.muted }}>
        frame {frame} / {durationInFrames}
      </div>
      {items.map((item) => {
        const left = (item.window.startFrame / durationInFrames) * 100;
        const w = ((item.window.endFrame - item.window.startFrame) / durationInFrames) * 100;
        const active = frame >= item.window.startFrame && frame < item.window.endFrame;
        return (
          <div key={item.label} style={{ marginBottom: 6 }}>
            <div style={{ opacity: active ? 1 : 0.6 }}>
              {item.label}
              {item.position ? ` · ${item.position}` : ""}
            </div>
            <div
              style={{
                position: "relative",
                height: 8,
                background: "rgba(148,163,184,0.25)",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `${w}%`,
                  top: 0,
                  bottom: 0,
                  background: active ? palette.cyan : palette.sky,
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `${(frame / durationInFrames) * 100}%`,
                  top: -2,
                  bottom: -2,
                  width: 2,
                  background: palette.ink,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
