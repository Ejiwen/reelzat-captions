import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SoundSpec = {
  file: string;
  durationSeconds: number;
  promptInfluence: number;
  prompt: string;
};

const sounds: SoundSpec[] = [
  {
    file: "hook-identity.mp3",
    durationSeconds: 1.8,
    promptInfluence: 0.62,
    prompt:
      "Premium restrained broadcast sonic identity: a soft low-frequency pulse followed by a clean rising silk whoosh and one tiny warm glass highlight. Modern Arabic cultural media brand, elegant and intelligent, no trailer boom, no percussion, no voice, no melody, dry studio mix, fast clean decay.",
  },
  {
    file: "caption-reveal.mp3",
    durationSeconds: 0.9,
    promptInfluence: 0.7,
    prompt:
      "Very subtle short editorial UI reveal sound: delicate soft-air sweep with a faint paper-silk texture and a tiny muted glass tick at the end. Under dialogue, understated, warm, premium broadcast motion graphics, no bass hit, no voice, no musical note, clean quick decay.",
  },
  {
    file: "cta-open.mp3",
    durationSeconds: 2.1,
    promptInfluence: 0.65,
    prompt:
      "Elegant symmetrical sonic reveal beginning at the center and expanding smoothly to the left and right: two soft silk-air whooshes, warm luminous harmonic shimmer, subtle pearl sparkle as text rises from a line. Premium Arabic media identity, calm physical motion, no percussion, no voice, no aggressive impact, spacious stereo, gentle decay.",
  },
  {
    file: "cta-close.mp3",
    durationSeconds: 2.2,
    promptInfluence: 0.68,
    prompt:
      "Calm reverse sonic closure: two soft stereo silk trails gently fold from the sides back into the center, a warm shimmer descends and resolves into one quiet rounded pulse. Elegant premium media motion graphic, slow natural deceleration, no sudden stop, no voice, no percussion, no dramatic bass, clean fade to silence.",
  },
  {
    file: "outro-signature.mp3",
    durationSeconds: 4.4,
    promptInfluence: 0.72,
    prompt:
      "Refined Mauritanian desert-inspired instrumental sonic logo. One warm intimate tidinit-like lute gesture, answered by delicate ardin-like harp resonance, resolving into a brief noble Moorish modal phrase with airy Saharan space and a soft golden tail. Modern, minimal and contemplative, not festive. No vocals, ululation, drums, cinematic boom, generic Middle Eastern cliche or busy melody. Premium broadcast mix for logo and slogan.",
  },
];

const parseEnv = (contents: string): Record<string, string> =>
  Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );

const main = async () => {
  const env = parseEnv(await readFile(path.resolve(".env"), "utf8"));
  const apiKey = env.ELEVEN_LABS ?? env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ELEVEN_LABS or ELEVENLABS_API_KEY in .env");
  }

  const outputDir = path.resolve("public/sfx/wazin-identity");
  await mkdir(outputDir, { recursive: true });

  const requested = new Set(process.argv.slice(2));
  const selectedSounds =
    requested.size === 0
      ? sounds
      : sounds.filter((sound) => requested.has(sound.file));
  if (selectedSounds.length === 0) {
    throw new Error(
      `No matching sound requested. Available files: ${sounds.map((sound) => sound.file).join(", ")}`,
    );
  }

  for (const sound of selectedSounds) {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: sound.prompt,
          duration_seconds: sound.durationSeconds,
          prompt_influence: sound.promptInfluence,
          model_id: "eleven_text_to_sound_v2",
          loop: false,
        }),
      },
    );

    if (!response.ok) {
      const details = (await response.text()).slice(0, 800);
      throw new Error(
        `ElevenLabs failed for ${sound.file}: HTTP ${response.status} ${details}`,
      );
    }

    await writeFile(
      path.join(outputDir, sound.file),
      Buffer.from(await response.arrayBuffer()),
    );
    process.stdout.write(`generated ${sound.file}\n`);
  }
};

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
