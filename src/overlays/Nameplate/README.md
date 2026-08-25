# Nameplate

Compact identity chip — channel name plus (optionally) the episode title on
one line at phone-readable type sizes, separated by a gold dot — rotated 90°
on the left Y axis with the channel first and episode second, inside the
shared Facebook/TikTok safe region and away from the right-side action rail.
With timed choreography enabled, it enters from the left edge at frame zero,
holds for 13 seconds, then retreats and dissolves. It returns seven seconds
before the video hands off to the outro. Clips whose two moments would leave a
gap of two seconds or less keep the rail continuously visible instead of
flickering through an inelegant micro-gap.

The channel name stays physically fixed. If the episode title exceeds its
viewport, only the title pans slowly after a reading pause until its full text
has been revealed. The title resets at the closing appearance so both opening
and closing moments begin with a composed, readable layout. Reduced-motion
renders keep the title still.

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ channel: string; episodeTitle?: string }` | — | identity |
| `window` | `{ startFrame, endFrame }` | — | normally frame 0 → clip end |
| `animated` | `boolean` | `false` | opt in to the 13-second opening + 7-second closing choreography |
| `avoidFaces` | `boolean` | `false` | deprecated compatibility alias for `animated` |
| `position` | `"top" \| "bottom"` | `"top"` | band anchor |
| `direction` | `"rtl" \| "ltr"` | — | controls text direction; placement remains top-left |
| `animation` | `{ enter, exit }` | `{ enter: "slideEdge", exit: "fadeThrough" }` | |
| `safeArea` / `textZone` / `fontScale` / `reduced` | | | see `src/overlays/types.ts` |

## Usage

```tsx
<Nameplate
  data={{ channel: "أسمار وأفكار", episodeTitle: "مأساة حاضرة دارفور" }}
  window={{ startFrame: 0, endFrame: 801 }}
  position="top"
  direction="rtl"
  animated
/>
```

The `featured` hook deliberately reuses the quieter `social` nameplate:
translucent near-black surface, soft white typography and restrained gold.

Backend export keeps the legacy fixed rail by default. The existing export
switch enables the timed choreography:

```bash
.venv/bin/python -m reelzy export reel-005 --remotion --episode china \
  --hook-theme featured --nameplate-avoidance
```

Omit the flag (or pass `--no-nameplate-avoidance`) to keep the card fixed.
