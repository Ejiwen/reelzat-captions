# ProgressBar

A minimal circular editorial timeline for final reels: a quiet ring, cyan
progress arc, and a small gold playhead. It has no label and stays visually
subordinate to the hook and captions.

## Progress

Progress is deterministic and linear:

```ts
durationInFrames <= 1 ? 1 : clamp(frame / (durationInFrames - 1), 0, 1);
```

This is exactly `0` at frame 0 and exactly `1` at the final renderable frame.
Progress begins at 12 o'clock and always travels clockwise. Only intro/outro
visibility is eased—the playhead position never is.

## Facebook Feed safe region

The ring sits just inside the bottom of a centered 4:5 region inside the video:

```ts
safeRegionHeight = width / (4 / 5);
safeRegionTopPx = (height - safeRegionHeight) / 2;
safeRegionBottomPx = height - safeRegionTopPx;
ringCenterY = safeRegionBottomPx - safeAreaInsetPx * (width / 1080);
```

At 1080×1920 the bottom boundary is 1635px, or 85.15625% of the frame height.

## Configuration

All defaults live in `config.ts`. Pixel settings are authored at 1080px width
and scale responsively.

| Option                                           | Purpose                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `enabled`                                        | Globally renders or removes the overlay.                    |
| `direction`                                      | `auto` follows the prop; `rtl` and `ltr` force a direction. |
| `facebookSafeAspectRatio`                        | Width/height ratio used for the centered safe region.       |
| `safeAreaInsetPx`                                | Moves the ring upward from the safe-region bottom boundary. |
| `ringSizePx`, `logoDiscSizePx`                   | Outer progress-ring diameter and the smaller inner logo disc. |
| `captionClearancePx`                             | Gap kept between a bottom two-line caption and the ring.      |
| `animatedLogoSrc`, `staticLogoSrc`               | One-shot Wazin animation and the still that replaces it.     |
| `logoSizePct`                                    | Logo size inside its disc.                                   |
| `animatedLogoDurationSeconds`                    | Natural duration of the one-shot logo animation.             |
| `logoTransitionFrames`                           | Crossfade overlap from animated to static logo at 30fps.     |
| `backgroundColor`, `backgroundOpacity`           | Subtle disc behind the ring for footage contrast.           |
| `trackHeightPx`                                  | Ring and progress-arc thickness.                             |
| `trackOpacity`, `trackColor`                     | Unfilled track appearance.                                  |
| `fillColorStart`, `fillColorEnd`                 | Filled-arc gradient.                                        |
| `indicatorSizePx`                                | Gold playhead diameter.                                     |
| `indicatorBorderWidthPx`, `indicatorBorderColor` | Playhead outline.                                           |
| `indicatorColor`                                 | Playhead body colour.                                       |
| `indicatorGlowColor`, `indicatorGlowOpacity`     | Restrained playhead highlight/glow.                         |
| `introFrames`, `introScaleFrom`                  | Entrance duration and initial scale.                        |
| `outroFrames`, `outroOpacityTo`                  | Final gentle fade duration and opacity floor.               |

`reduced` removes scale motion while retaining the cross-fade. Progress itself
is always linear and is unaffected by these visibility settings.

## Integration

Rendered once in `AuthoredReel` and `AsrCaptioned`, immediately above video
and below text overlays/debug guides. It is intentionally omitted from the
standalone Legacy composition because that path is not part of the reel
package pipeline.
