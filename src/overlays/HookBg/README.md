# HookBg

A premium solid-colour gradient motion background behind the hook — layered
colour fields, not a card and not a photo texture. Its job is to strengthen
hook readability over any video while staying visually subordinate to the
text. Everything animates deterministically from Remotion frame state.

## Shape

`hookConfig.background.shape`:

- **`"band"` (default)** — an edge-to-edge horizontal colour strip behind the
  hook, feathered only at its top and bottom. It has no outline of its own,
  so it reads as a cinematic colour grade across the frame, not as a shape.
  `widthPct` is ignored (always full width); `heightPct` sets the strip
  height relative to the hook band; entrances scale on Y only so a gap can
  never appear at the frame edges.
- **`"ellipse"`** — the earlier feathered oval veil, kept for reuse.

## Visual structure (back → front)

1. **Base veil** — the darkest, most stable tone of the theme, as a radial
   falloff. Carries text contrast.
2. **Primary gradient field** — a large restrained colour mass offset toward
   the top-inline corner, drifting almost imperceptibly during reading.
3. **Secondary gradient field** — a softer complementary mass offset the
   opposite way (bottom-inline), lower opacity, heavily feathered.
4. **Edge vignette** — subtle darkening that separates the hook from video
   content without forming a panel.
5. **Directional light sweep** — one broad diagonal highlight pass during the
   entrance. It never loops.

The whole stack sits inside a feathered elliptical mask, so edges always
dissolve into the video — there is no rectangle to see and therefore no
`borderRadiusPx` control.

## The five editorial themes

Theme names describe editorial meaning, not colour. Set them per reel, per
Studio session, or let the keyword fallback pick one.

| Theme | Intended for | base | primary | secondary | highlight | vignette |
| --- | --- | --- | --- | --- | --- | --- |
| `politics` | political commentary, state affairs, conflict analysis | `#190B12` | `#6E1524` | `#132441` | `#C4737C` | `#070409` |
| `religion` | faith, worship, ethics — calm and dignified | `#071510` | `#14532D` | `#0B3B33` | `#C9A44E` | `#030906` |
| `culture` | literature, poetry, history, philosophy | `#130E21` | `#3B2A6B` | `#5B2A55` | `#C7A45C` | `#090714` |
| `general` | mixed/general topics — native navy/cyan identity | `#081527` | `#0B1F3A` | `#155E75` | `#7DD3FC` | `#040B15` |
| `social` | social stories, family, personal topics | `#1C1108` | `#92400E` | `#7C2D12` | `#E8B15C` | `#100904` |

All palettes are deep and desaturated on purpose: the hook's ink text and
gold word entrance stay the brightest things on screen in every theme.

## Selecting a theme

Priority (first match wins):

1. **Studio prop** — `hookBgTheme` on the `AuthoredReel` composition.
2. **Project-wide override** — the easiest way: set
   `hookConfig.background.themeOverride` in `../Hook/config.ts` to one of the
   five themes and every reel uses it, no `authoring.json` edits needed.
   `null` restores per-reel behaviour.
3. **Per-reel package field** — optional in `authoring.json`:
   ```jsonc
   { "hook": { "text": "…", "backgroundTheme": "politics" } }
   ```
   Backward compatible: packages without the field behave exactly as before.
   Unknown values are ignored (they fall through to the next step) — a typo
   can never fail a reel.
4. **Deterministic keyword fallback** — Arabic/English stems in the hook text
   (`سياس/حكوم/السودان → politics`, `قرآن/إيمان → religion`,
   `شعر/تاريخ/فلسف → culture`, `عائل/مجتمع/علاق → social`). Pure substring
   matching, same input → same output; see `themes.ts`.
5. **Configured default** — `hookConfig.background.defaultTheme`
   (in `../Hook/config.ts`), currently `general`.

## Motion

- **Entrance** (`entranceFrames`, authored at 30 fps): opacity rises with an
  eased curve, the veil settles from `entranceScaleFrom`/
  `entranceTranslateYPx` into place, and the light sweep makes its single
  pass. Complements the hook's gold word cascade without duplicating it.
- **Stable reading**: only the two gradient fields drift — a monotonic,
  decelerating travel of `driftAmountPx` over `driftPeriodSeconds`. It never
  reverses, loops, or pulses.
- **Exit**: driven by the Hook's own `exitProgress` (the reverse word
  cascade), so background and words always dissolve together; the veil eases
  slightly outward to `exitScaleTo`. There is deliberately no `exitFrames`
  control — sync comes from the Hook.
- **Reduced mode** (`reduced`): all spatial movement is removed (no drift, no
  sweep, no scale/translate); only the deterministic opacity cross-fade
  remains. The selected theme colours are preserved.

## Configuration

Production values live in `../Hook/config.ts` under `hookConfig.background`
(type `HookBgConfig` in `types.ts`):

- `enabled`, `defaultTheme`
- `widthPct` / `heightPct` — size relative to the Hook layout band
- `opacity` (master), `baseOpacity`, `primaryFieldOpacity`,
  `secondaryFieldOpacity`, `vignetteOpacity` — per-layer strengths (0..1)
- `backdropBlurPx` — optional local video blur (0 = off)
- `entranceFrames`, `entranceScaleFrom`, `entranceTranslateYPx`, `exitScaleTo`
- `driftAmountPx`, `driftPeriodSeconds`
- `lightSweepEnabled`, `lightSweepOpacity`, `lightSweepWidthPct`
- `themes` — the palette table (defaults from `themes.ts`)

Frame counts are authored at 30 fps and scale with the actual fps; pixel
values are authored at 1080 px width and scale with `width / 1080`.

Per-instance: `<HookBg theme="culture" config={{ opacity: 0.8 }} …/>` —
`config` is a partial override merged over `settings`.

## Layering

Video → ProgressBar → **HookBg** → Hook text → captions/Nameplate → debug.
Hook renders HookBg itself at `zIndex: 0` inside its band with the text at
`zIndex: 1`, so the background can never cover the hook.

## Studio demos

`Components/HookBg-Politics|Religion|Culture|General|Social` — each renders a
realistic Arabic hook via the real `Hook` component over a bright-into-dark
mock video stage, covering entrance, stable reading and exit within 6 s.
