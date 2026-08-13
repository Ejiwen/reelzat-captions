// Publish-ready outro controls. Frames are authored at 30fps and pixel values
// at 1080px composition width.
export type OutroConfig = {
  enabled: boolean;
  durationSeconds: number;
  transitionFadeFrames: number;
  coverFrames: number;
  logoTravelStartFrame: number;
  logoTravelFrames: number;
  logoSizePx: number;
  logoStartScale: number;
  sloganStartFrame: number;
  websiteStartFrame: number;
  textRevealFrames: number;
  sloganFontSizePx: number;
  websiteFontSizePx: number;
  logoSloganGapPx: number;
  sloganWebsiteGapPx: number;
  contentWidthPct: number;
  backgroundColor: string;
  ambientLightOpacity: number;
  themeLightOpacity: number;
  glowOpacity: number;
  orbitOpacity: number;
  exitFrames: number;
};

export const outroConfig: OutroConfig = {
  enabled: true,
  durationSeconds: 4.8,
  transitionFadeFrames: 30,
  coverFrames: 26,
  logoTravelStartFrame: 5,
  logoTravelFrames: 28,
  logoSizePx: 330,
  logoStartScale: 0.44,
  sloganStartFrame: 58,
  websiteStartFrame: 72,
  textRevealFrames: 18,
  sloganFontSizePx: 45,
  websiteFontSizePx: 28,
  logoSloganGapPx: 54,
  sloganWebsiteGapPx: 18,
  contentWidthPct: 84,
  backgroundColor: "#070A12",
  ambientLightOpacity: 0.38,
  themeLightOpacity: 0.28,
  glowOpacity: 0.5,
  orbitOpacity: 0.34,
  exitFrames: 10,
};
