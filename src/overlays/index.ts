// Overlay catalog. Every component is pure props-in, pixels-out — reusable
// outside this repo together with src/motion/ and src/design/.
export * from "./types";
export { OverlayRoot } from "./OverlayRoot";
export { Hook, type HookProps } from "./Hook";
export { CaptionShort, type CaptionShortProps } from "./CaptionShort";
export { CaptionLong, type CaptionLongProps } from "./CaptionLong";
export { Nameplate, type NameplateProps } from "./Nameplate";
export { SafeAreaGuides, WindowTimeline, type TimelineItem } from "./SafeArea";
export { staggeredWordStyle, staggerSettleFrames } from "./wordStagger";
