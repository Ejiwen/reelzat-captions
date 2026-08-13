# HookEnergyBridge

The visual statement that the **Wazin identity circle is the energy source of
the Hook**: on the hook's entrance the circle emits one restrained pulse, a
soft colour field travels up a gently bowed path, blooms into the HookBg
footprint, and dissolves as the background settles and the words become
readable. On the hook's exit a smaller, quieter pull drains back toward the
circle and ends in a single confirmation pulse. One coherent brand motion —
not a laser, not a particle effect, never a loop.

## Shared geometry

- **Source** — `getProgressBarGeometry()` in `../ProgressBar/math.ts`: the
  exact centre/radii the ProgressBar itself renders with (`centerX =
  width / 2`, `centerY` from the Facebook 4:5 safe-region placement, scaled
  by `width / 1080`). If the ring ever moves or resizes, the emission moves
  with it automatically.
- **Destination** — `getHookBgGeometry()` in `math.ts`: the HookBg footprint
  derived from `hookConfig` (`yPct`, `bandHeightPct`,
  `background.heightPct/shape`) — never hardcoded to one reel.
- **Path** — a quadratic Bézier bowed `pathCurvePx` sideways at its midpoint
  (`bridgeControlPoint`), so travel never reads as a mechanical straight
  line.

## Timeline

`hookEnergyTimeline({ window, fps, config })` derives everything from the
Hook window (defaults at 30 fps):

| Phase | Frames | What happens |
| --- | --- | --- |
| ignition | 6 | ring-shaped highlight pulse around the circle (logo never covered) |
| travel | 12 | core (primary+highlight) leaves the circle, elongating; outer bloom (secondary) trails; one low-opacity sweep |
| expansion | 8 | destination bloom (primary) grows into the HookBg footprint while HookBg's own entrance resolves through it |
| settle | 6 | all travelling energy dissolves; the screen becomes calm |
| *stable hold* | — | **the bridge is fully unmounted** — only HookBg's subtle drift remains |
| return | 14 (ends 2 frames before the window closes) | smaller/quieter mass drains back along the path; circle answers with one confirmation pulse |

Short hook windows compress the entrance into at most the first half of the
window and the return into the last quarter — phases always stay ordered.
The Hook window, word stagger, gold transition, hold and exit timing are
untouched; the bridge adapts to them.

## Theme inheritance

The bridge receives the **already-resolved** HookBg theme from AuthoredReel
(one `resolveHookBgTheme` call feeds both), and maps the palette:
source pulse → `highlight` · energy core → `primary`+`highlight` mix ·
outer bloom → `secondary` · destination bloom → `primary`. There is no sixth
palette; all five themes stay recognizable in emission form.

## Reduced motion

No travel, no curve, no pulses: a single soft theme-coloured cross-fade
centred between source and destination, entering and leaving on the same
deterministic intervals. The circle stays perfectly stable.

## Layering

Video → ProgressBar → **HookEnergyBridge** → Hook (HookBg inside at z0, text
at z1) → captions → Nameplate → debug. The bridge renders before Hook, so
its blooms sit *under* the HookBg and *over* the ring; the source pulse is a
transparent-centred ring glow, so neither the Wazin logo nor the progress
ring is ever obscured. ProgressBar's geometry, progress formula, one-shot
logo animation and crossfade are untouched (the "ring brightness lift" is an
additive glow layer, not a ProgressBar change — see deviations in the root
report).

## Configuration

`config.ts` (`hookEnergyBridgeConfig`) — all frames at 30 fps, px at 1080:
phase durations (`ignition/travel/expansion/settle/returnFrames`), source
pulse (`sourcePulseScaleTo/Opacity/RadiusPx`, `ringPulseGlowOpacity`), core
(`coreWidthPx/BlurPx/Opacity`), bloom (`bloomWidthPx/BlurPx/Opacity`),
destination (`destinationScaleFrom/Opacity`), `pathCurvePx`, `sweepOpacity`.
Per-instance: `<HookEnergyBridge config={{ coreOpacity: 0.4 }} …/>`.

**Tuning intensity**: lower `coreOpacity`/`bloomOpacity` first, then
`destinationOpacity`; keep `sweepOpacity` ≤ 0.2; never lengthen `travel`
past ~16 frames or the opening starts to feel slow.

## Integration

Rendered once in `AuthoredReel`, only when the package has an authored hook
and `hookConfig.background.enabled`. Returns `null` outside the entrance and
return intervals — including the entire stable hold.

## Demos

`Components/HookEnergyBridge-Demo` (general) plus
`HookEnergy-Politics|Religion|Culture|General|Social`: real ProgressBar
position, real Hook + HookBg, full sequence over bright/dark regions.
