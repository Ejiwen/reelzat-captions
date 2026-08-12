# Nameplate

Compact identity chip — channel name plus (optionally) the episode title on
one line at phone-readable type sizes, separated by a gold dot — rotated 90°
on the left Y axis with the channel first and episode second, inside the
shared Facebook/TikTok safe region and away from the right-side action rail.
Persistent but quiet: it enters from the safe left edge on `slideEdge`, stays
fully visible and stable throughout the reel, then leaves with a restrained
`fadeThrough` during the final frames.

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ channel: string; episodeTitle?: string }` | — | identity |
| `window` | `{ startFrame, endFrame }` | — | normally frame 0 → clip end |
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
/>
```
