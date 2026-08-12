# Nameplate

Channel identity chip — channel name plus (optionally) the episode title —
sitting in the inline-start corner of the safe area. Persistent but quiet: it
enters on `slideEdge` after the hook exits and then just stays. While any
window in `dimWindows` is active (captions sharing its band) it yields fully
— fading to 0 with an 8-frame ramp — so it never competes with, or collides
with, a caption.

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ channel: string; episodeTitle?: string }` | — | identity |
| `window` | `{ startFrame, endFrame }` | — | usually hook-end → clip-end |
| `position` | `"top" \| "bottom"` | `"top"` | band anchor |
| `direction` | `"rtl" \| "ltr"` | — | corner = inline-start (right for RTL) |
| `animation` | `{ enter, exit }` | `{ enter: "slideEdge", exit: "fadeThrough" }` | |
| `dimWindows` | `OverlayWindow[]` | `[]` | fade out fully while any is active |
| `safeArea` / `textZone` / `fontScale` / `reduced` | | | see `src/overlays/types.ts` |

## Usage

```tsx
<Nameplate
  data={{ channel: "أسمار وأفكار", episodeTitle: "مأساة حاضرة دارفور" }}
  window={{ startFrame: 92, endFrame: 801 }}
  position="top"
  direction="rtl"
  dimWindows={[{ startFrame: 360, endFrame: 450 }]}
/>
```
