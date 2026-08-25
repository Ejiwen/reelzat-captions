import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HOOK_BG_THEMES,
  hookBgPalettes,
  keywordThemeFor,
  parseHookBgTheme,
  resolveHookBgTheme,
} from "../src/overlays/HookBg/themes";
import { resolveReelPackage } from "../src/ingest/resolve";

// ---------------------------------------------------------------------------
// Theme catalogue

test("six semantic themes exist, each with a complete palette", () => {
  assert.deepEqual(
    [...HOOK_BG_THEMES],
    ["politics", "religion", "culture", "general", "social", "featured"],
  );
  for (const theme of HOOK_BG_THEMES) {
    const palette = hookBgPalettes[theme];
    for (const key of [
      "base",
      "primary",
      "secondary",
      "highlight",
      "vignette",
    ] as const) {
      assert.match(
        palette[key],
        /^#[0-9A-Fa-f]{6}$/,
        `${theme}.${key} must be a hex colour`,
      );
    }
    for (const key of ["foreground", "mutedForeground", "accent"] as const) {
      assert.match(
        palette[key],
        /^#[0-9A-Fa-f]{6}$/,
        `${theme}.${key} must be a hex colour`,
      );
    }
    assert.ok(palette.surface === "dark" || palette.surface === "light");
  }
  assert.equal(hookBgPalettes.featured.surface, "light");
  assert.notEqual(
    hookBgPalettes.featured.foreground,
    hookBgPalettes.general.foreground,
    "featured must carry dark ink instead of inheriting the default white ink",
  );
  assert.equal(
    hookBgPalettes.featured.accent,
    "#8A315E",
    "featured emphasis needs a dark chromatic accent over the pearl surface",
  );
});

// ---------------------------------------------------------------------------
// parseHookBgTheme — untrusted input narrowing

test("parseHookBgTheme accepts known themes and rejects everything else", () => {
  assert.equal(parseHookBgTheme("politics"), "politics");
  assert.equal(parseHookBgTheme("social"), "social");
  assert.equal(parseHookBgTheme("featured"), "featured");
  assert.equal(parseHookBgTheme("neon"), null); // unknown string
  assert.equal(parseHookBgTheme("POLITICS"), null); // case-sensitive contract
  assert.equal(parseHookBgTheme(undefined), null);
  assert.equal(parseHookBgTheme(null), null);
  assert.equal(parseHookBgTheme(42), null);
});

// ---------------------------------------------------------------------------
// resolveHookBgTheme — priority: explicit → keyword → default

test("an explicit theme always wins over keywords", () => {
  assert.equal(
    resolveHookBgTheme({
      explicit: "culture",
      text: "الحرب والسياسة في السودان", // politics keywords
      fallback: "general",
    }),
    "culture",
  );
});

test("an unknown explicit theme degrades to the keyword fallback", () => {
  assert.equal(
    resolveHookBgTheme({
      explicit: "not-a-theme",
      text: "قصة الانتخابات التي غيّرت الدولة",
      fallback: "general",
    }),
    "politics",
  );
});

test("keyword fallback maps Arabic editorial registers", () => {
  assert.equal(
    keywordThemeFor("قبل ٣٠ عاماً تنبّأ بمصير حكومة السودان"),
    "politics",
  );
  assert.equal(keywordThemeFor("آية من القرآن غيّرت حياته"), "religion");
  assert.equal(keywordThemeFor("بيت شعرٍ خلّده التاريخ"), "culture");
  assert.equal(keywordThemeFor("قصة عائلة بدأت من رسالة"), "social");
  assert.equal(keywordThemeFor("لقطة لا تُنسى في مباراة الأمس"), null);
});

test("no explicit theme and no keyword match → configured default", () => {
  assert.equal(
    resolveHookBgTheme({
      text: "لقطة لا تُنسى في مباراة الأمس",
      fallback: "general",
    }),
    "general",
  );
  assert.equal(resolveHookBgTheme({ fallback: "culture" }), "culture");
});

// ---------------------------------------------------------------------------
// Package integration — hook.backgroundTheme is optional and lenient

const packageWith = (hook: Record<string, unknown>) =>
  resolveReelPackage({
    clipId: "reel-x",
    packageDir: "reels/reel-x",
    sidecar: {
      schemaVersion: 2,
      clipId: "reel-x",
      width: 1080,
      height: 1920,
      fps: 30,
      durationInSeconds: 22,
      language: "ar",
      direction: "rtl",
      captionSource: "authored",
      authoring: {
        schemaVersion: 1,
        kind: "reel",
        clipId: "reel-x",
        source: {
          episodeTitle: "حلقة",
          channel: "قناة",
          language: "ar",
          direction: "rtl",
        },
        hook: {
          text: "خطاف",
          position: "top",
          display: { start: 0, end: 3 },
          ...hook,
        },
        captions: [],
      },
    },
  });

test("a package with hook.backgroundTheme resolves it typed", () => {
  const pkg = packageWith({ backgroundTheme: "politics" });
  assert.equal(pkg.authored?.hook.backgroundTheme, "politics");
});

test("packages without backgroundTheme keep working (backward compatibility)", () => {
  const pkg = packageWith({});
  assert.equal(pkg.authored?.hook.backgroundTheme, null);
});

test("an unknown backgroundTheme never fails the package — it degrades to null", () => {
  const pkg = packageWith({ backgroundTheme: "hot-pink" });
  assert.equal(pkg.authored?.hook.backgroundTheme, null);
});
