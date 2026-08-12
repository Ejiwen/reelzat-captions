# Hook

The opening statement of a reel — the strongest element on screen. Larger
type than any caption, an OKLCH accent underline that sweeps in after the
text resolves, `blurIn` (+ springPop scale) entrance and a quick `dipExit`.
Designed to read within its first 3 words.

Pure props-in, pixels-out: no file access, no package knowledge. Liftable
into any Remotion project together with `src/motion/` and `src/design/`.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ text: string }` | — | the hook line |
| `window` | `{ startFrame, endFrame }` | — | frames the hook owns; exit finishes before `endFrame` |
| `position` | `"top" \| "bottom"` | `"top"` | band anchor |
| `direction` | `"rtl" \| "ltr"` | — | writing direction (underline sweeps from the inline-start edge) |
| `animation` | `{ enter, exit }` | `{ enter: "blurIn", exit: "dipExit" }` | preset names from `src/motion/` |
| `safeArea` | `{ topPct, bottomPct, sidePct }` | `14 / 20 / 7` | percent margins |
| `textZone` | director rect or `null` | `null` | wins over the band when provided |
| `fontScale` | `number` | `1` | multiplies the base size (`width × 0.062`) |
| `reduced` | `boolean` | `false` | collapse movement to cross-fades |

## Usage

```tsx
<Hook
  data={{ text: "أربع دول خرجت من دولة واحدة" }}
  window={{ startFrame: 0, endFrame: 90 }}
  position="top"
  direction="rtl"
/>
```

Sizing: fits on one line when possible; long hooks shrink to 0.7× base and
then wrap balanced onto two lines. Measured once per text, never per frame —
no layout shift.
