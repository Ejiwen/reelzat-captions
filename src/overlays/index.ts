// Overlay catalog. Every component is pure props-in, pixels-out — reusable
// outside this repo together with src/motion/ and src/design/.
export * from "./types";
export { OverlayRoot } from "./OverlayRoot";
export { Hook, type HookProps } from "./Hook";
export {
  HookBg,
  HOOK_BG_THEMES,
  hookBgPalettes,
  parseHookBgTheme,
  resolveHookBgTheme,
  type HookBgConfig,
  type HookBgPalette,
  type HookBgProps,
  type HookBgSettings,
  type HookBgTheme,
} from "./HookBg";
export {
  HookEnergyBridge,
  hookEnergyBridgeConfig,
  hookEnergyTimeline,
  getHookBgGeometry,
  type HookEnergyBridgeConfig,
  type HookEnergyBridgeProps,
  type HookEnergyTimeline,
  type HookBgGeometry,
} from "./HookEnergyBridge";
export { CaptionShort, type CaptionShortProps } from "./CaptionShort";
export { CaptionLong, type CaptionLongProps } from "./CaptionLong";
export {
  CaptionEnergyBridge,
  CaptionEnergySurface,
  captionEnergyConfig,
  type CaptionEnergyBridgeProps,
  type CaptionEnergyConfig,
  type CaptionEnergySurfaceProps,
} from "./CaptionEnergy";
export { Nameplate, type NameplateProps } from "./Nameplate";
export {
  ProgressBar,
  type ProgressBarProps,
  type ProgressBarConfig,
} from "./ProgressBar";
export { SafeAreaGuides, WindowTimeline, type TimelineItem } from "./SafeArea";
export { staggeredWordStyle, staggerSettleFrames } from "./wordStagger";
