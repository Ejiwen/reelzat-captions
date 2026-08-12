# Hook

The opening statement of a reel — the strongest element on screen. Larger
type than any caption. Words reveal in sequence with a soft 20px rise and
opacity ramp. Each word starts in golden yellow with a restrained glow, then
settles into the normal ink colour before one shimmer sweep and the accent
line. The outro reverses the word order and returns each fading word to gold.
Arabic is always animated by whole word, never by character. Designed to read
within its first 3 words.

Its vertical placement is controlled globally by `config.ts`:

```ts
export const hookConfig = {
  fontSizeScale: 1, // 1.15 = 15% larger; 0.9 = 10% smaller
  yPct: 65, // 0 = top, 50 = frame centre, 100 = bottom
  bandHeightPct: 24,
  extraHoldSeconds: 2, // added steady reading time; motion is unchanged
};
```

Change `fontSizeScale` to resize only the hook, `yPct` to move every hook
vertically, and `extraHoldSeconds` to add or remove steady reading time between
the entrance and exit without changing either animation.

`background` controls the cinematic veil rendered by `../HookBg`: toggle it,
resize it, and tune its navy strength, gold glow, blur, and entrance motion
from the same hook config file.

Pure props-in, pixels-out: no file access, no package knowledge. Liftable
into any Remotion project together with `src/motion/` and `src/design/`.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ text: string }` | — | the hook line |
| `window` | `{ startFrame, endFrame }` | — | frames the hook owns; exit finishes before `endFrame` |
| `position` | `"top" \| "bottom"` | `"top"` | semantic position used by choreography; visual Y comes from `config.ts` |
| `direction` | `"rtl" \| "ltr"` | — | writing direction (underline sweeps from the inline-start edge) |
| `animation` | `{ enter, exit }` | — | optional container motion layered over the built-in word reveal |
| `safeArea` | `{ topPct, bottomPct, sidePct }` | `14 / 20 / 7` | percent margins |
| `textZone` | director rect or `null` | `null` | contributes horizontal bounds and height; `config.ts` still controls Y |
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
