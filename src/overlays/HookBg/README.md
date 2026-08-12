# HookBg

The cinematic focus veil behind the hook. It is deliberately not a card:
soft navy falloff lowers local video contrast, backdrop blur calms detail,
and a restrained gold centre glow connects it to the hook's word reveal.

The component is pure props-in, pixels-out. Production settings live in
`../Hook/config.ts` under `hookConfig.background`, keeping all hook controls
in one place.

## Settings

- `enabled`: toggle the background.
- `widthPct` / `heightPct`: size relative to the Hook layout band.
- `backdropBlurPx`: local video blur.
- `navyOpacityPct`: darkness/readability strength.
- `goldGlowOpacityPct`: warmth behind the text.
- `entryFrames`, `translateYPx`, `scaleFrom`: entrance motion controls.

The exit progress is supplied by `Hook`, so the background dissolves in sync
with the existing word exit without changing that animation.
