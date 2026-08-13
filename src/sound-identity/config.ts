export type SoundIdentityConfig = {
  enabled: boolean;
  assetDir: string;
  hookVolume: number;
  captionVolume: number;
  ctaOpenVolume: number;
  ctaCloseVolume: number;
  outroVolume: number;
  hookDuckGain: number;
  captionDuckGain: number;
  ctaDuckGain: number;
  duckAttackSeconds: number;
  duckReleaseSeconds: number;
};

export const soundIdentityConfig: SoundIdentityConfig = {
  enabled: true,
  assetDir: "sfx/wazin-identity",
  hookVolume: 0.16,
  captionVolume: 0.052,
  ctaOpenVolume: 0.105,
  ctaCloseVolume: 0.082,
  outroVolume: 0.14,
  hookDuckGain: 0.86,
  captionDuckGain: 0.95,
  ctaDuckGain: 0.9,
  duckAttackSeconds: 0.16,
  duckReleaseSeconds: 0.38,
};
