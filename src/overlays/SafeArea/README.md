# SafeArea

Debug-only guides — drawn when a composition's `debug` prop is on, never in a
normal render.

- **`SafeAreaGuides`** — dashed lines for the hook band (top, sky), the
  caption band (bottom, cyan) and the side gutters; director **text-safe
  zones** (cyan rectangles) and **face zones** (red rectangles — never cover
  these).
- **`WindowTimeline`** — a bottom-left panel with one bar per overlay window
  against the full duration, playhead marked. Deliberately LTR/monospace: it
  is a dev instrument, not a broadcast element.

## Usage

```tsx
{debug ? (
  <>
    <SafeAreaGuides safeArea={pkg.safeArea} textZones={zones} faceZones={faces} />
    <WindowTimeline items={overlays.map((o) => ({ label: o.label, window: o.window }))} />
  </>
) : null}
```
