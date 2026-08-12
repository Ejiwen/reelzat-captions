// Batch renderer — the pipeline's final step. Bundles the project ONCE, then
// renders every discovered reel through a concurrency pool. Speed rules:
//   - one bundle, N selectComposition/renderMedia calls
//   - pool defaults to min(reels, cpus - 1); browser concurrency per render
//     is divided so the pool never oversubscribes the machine
//   - up-to-date outputs are skipped unless --force (mtime of every package
//     file vs the output)
//   - one failed reel never kills the batch; failures land in the report and
//     the exit code.
//
// Usage:
//   npm run render:batch                        # everything, burn mode → out/
//   npm run render:batch -- --only reel-001,promo-001
//   npm run render:batch -- --mode alpha        # transparent ProRes 4444 .mov
//   npm run render:batch -- --frames=0-90       # smoke render
//   npm run render:batch -- --force --out dist/ --concurrency 4
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { discoverReels } from "../src/ingest/node";
import type { ReelPackage } from "../src/ingest/resolve";
import {
  defaultAsrCaptionedProps,
  defaultAuthoredReelProps,
} from "../src/schema/reelProps";

const projectRoot = resolve(__dirname, "..");
const reelsDir = join(projectRoot, "public", "reels");

// ---------------------------------------------------------------------------
// CLI

type Cli = {
  only: string[] | null;
  force: boolean;
  mode: "burn" | "alpha";
  outDir: string;
  concurrency: number | null;
  frameRange: [number, number] | null;
};

const parseCli = (argv: string[]): Cli => {
  const cli: Cli = {
    only: null,
    force: false,
    mode: "burn",
    outDir: join(projectRoot, "out"),
    concurrency: null,
    frameRange: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = () => {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : argv[++i];
      if (value === undefined) {
        throw new Error(`Missing value for ${arg}`);
      }
      return value;
    };
    if (arg === "--force") {
      cli.force = true;
    } else if (arg.startsWith("--only")) {
      cli.only = next().split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith("--mode")) {
      const mode = next();
      if (mode !== "burn" && mode !== "alpha") {
        throw new Error(`--mode must be burn or alpha, received "${mode}"`);
      }
      cli.mode = mode;
    } else if (arg.startsWith("--out")) {
      cli.outDir = resolve(projectRoot, next());
    } else if (arg.startsWith("--concurrency")) {
      cli.concurrency = Number(next());
      if (!Number.isInteger(cli.concurrency) || cli.concurrency < 1) {
        throw new Error(`--concurrency must be a positive integer`);
      }
    } else if (arg.startsWith("--frames")) {
      const m = next().match(/^(\d+)-(\d+)$/);
      if (!m) {
        throw new Error(`--frames must look like 0-90`);
      }
      cli.frameRange = [Number(m[1]), Number(m[2])];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return cli;
};

// ---------------------------------------------------------------------------
// Skip logic: an output is up to date when it is newer than EVERY file in the
// package folder.

const newestPackageMtime = (pkgDir: string): number => {
  let newest = 0;
  for (const entry of readdirSync(pkgDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      newest = Math.max(newest, statSync(join(pkgDir, entry.name)).mtimeMs);
    }
  }
  return newest;
};

const isUpToDate = (outputPath: string, pkgDir: string): boolean =>
  existsSync(outputPath) && statSync(outputPath).mtimeMs > newestPackageMtime(pkgDir);

// ---------------------------------------------------------------------------
// Per-reel render settings

const inputPropsFor = (pkg: ReelPackage, mode: "burn" | "alpha") =>
  pkg.captionSource === "authored"
    ? { packageDir: pkg.packageDir, clipId: pkg.clipId, ...defaultAuthoredReelProps, mode }
    : { packageDir: pkg.packageDir, clipId: pkg.clipId, ...defaultAsrCaptionedProps, mode };

const outputSettings = (mode: "burn" | "alpha") =>
  mode === "alpha"
    ? {
        extension: "mov",
        codec: "prores" as const,
        proResProfile: "4444" as const,
        imageFormat: "png" as const,
        pixelFormat: "yuva444p10le" as const,
      }
    : {
        extension: "mp4",
        codec: "h264" as const,
        proResProfile: undefined,
        imageFormat: "jpeg" as const,
        pixelFormat: "yuv420p" as const,
      };

type ReportEntry = {
  id: string;
  ok: boolean;
  skipped: boolean;
  outputPath: string;
  durationInFrames: number;
  renderMs: number;
  error?: string;
};

// ---------------------------------------------------------------------------

const main = async () => {
  const cli = parseCli(process.argv.slice(2));

  const { packages, failures } = discoverReels(reelsDir);
  for (const failure of failures) {
    console.error(`\n[render-batch] INVALID PACKAGE ${failure.clipId}:\n${failure.error}\n`);
  }

  let targets = packages;
  if (cli.only) {
    const wanted = new Set(cli.only);
    targets = packages.filter((p) => wanted.has(p.clipId));
    const missing = cli.only.filter((id) => !targets.some((p) => p.clipId === id));
    if (missing.length > 0) {
      throw new Error(`--only names unknown reels: ${missing.join(", ")}`);
    }
  }
  if (targets.length === 0) {
    throw new Error(`No reels to render (looked in ${reelsDir})`);
  }

  mkdirSync(cli.outDir, { recursive: true });
  const settings = outputSettings(cli.mode);

  // Partition before bundling: if everything is up to date, don't even bundle.
  const work: { pkg: ReelPackage; outputPath: string }[] = [];
  const report: ReportEntry[] = [];
  for (const pkg of targets) {
    const outputPath = join(cli.outDir, `${pkg.clipId}.${settings.extension}`);
    const pkgDir = join(projectRoot, "public", pkg.packageDir);
    if (!cli.force && isUpToDate(outputPath, pkgDir)) {
      console.log(`[render-batch] ${pkg.clipId}: up to date — skipped (use --force to re-render)`);
      report.push({
        id: pkg.clipId,
        ok: true,
        skipped: true,
        outputPath,
        durationInFrames: pkg.media.durationInFrames,
        renderMs: 0,
      });
    } else {
      work.push({ pkg, outputPath });
    }
  }

  if (work.length > 0) {
    console.log(`[render-batch] bundling once…`);
    const bundleStart = Date.now();
    const serveUrl = await bundle({ entryPoint: join(projectRoot, "src", "index.ts") });
    console.log(`[render-batch] bundled in ${((Date.now() - bundleStart) / 1000).toFixed(1)}s`);

    const poolSize = cli.concurrency ?? Math.max(1, Math.min(work.length, cpus().length - 1));
    // Divide browser tabs across the pool so N parallel renders don't each
    // grab cpus/2 workers.
    const perRenderConcurrency = Math.max(1, Math.floor((cpus().length - 1) / poolSize));
    console.log(
      `[render-batch] ${work.length} reel${work.length === 1 ? "" : "s"} · pool ${poolSize} · ${perRenderConcurrency} tab${perRenderConcurrency === 1 ? "" : "s"}/render · mode ${cli.mode}`,
    );

    const queue = [...work];
    const renderOne = async ({ pkg, outputPath }: (typeof work)[number]) => {
      const start = Date.now();
      try {
        const composition = await selectComposition({
          serveUrl,
          id: pkg.clipId,
          inputProps: inputPropsFor(pkg, cli.mode),
        });
        await renderMedia({
          serveUrl,
          composition,
          codec: settings.codec,
          proResProfile: settings.proResProfile,
          imageFormat: settings.imageFormat,
          pixelFormat: settings.pixelFormat,
          outputLocation: outputPath,
          inputProps: inputPropsFor(pkg, cli.mode),
          concurrency: perRenderConcurrency,
          frameRange: cli.frameRange ?? undefined,
        });
        const renderMs = Date.now() - start;
        console.log(`[render-batch] ✓ ${pkg.clipId} → ${outputPath} (${(renderMs / 1000).toFixed(1)}s)`);
        report.push({
          id: pkg.clipId,
          ok: true,
          skipped: false,
          outputPath,
          durationInFrames: pkg.media.durationInFrames,
          renderMs,
        });
      } catch (err) {
        const renderMs = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[render-batch] ✗ ${pkg.clipId} FAILED after ${(renderMs / 1000).toFixed(1)}s:\n${message}`);
        report.push({
          id: pkg.clipId,
          ok: false,
          skipped: false,
          outputPath,
          durationInFrames: pkg.media.durationInFrames,
          renderMs,
          error: message,
        });
      }
    };

    const workers = Array.from({ length: Math.min(poolSize, queue.length) }, async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) {
          return;
        }
        await renderOne(job);
      }
    });
    await Promise.all(workers);
  }

  report.sort((a, b) => a.id.localeCompare(b.id));
  const reportPath = join(cli.outDir, "render-report.json");
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        mode: cli.mode,
        frameRange: cli.frameRange,
        rendered: report.filter((r) => r.ok && !r.skipped).length,
        skipped: report.filter((r) => r.skipped).length,
        failed: report.filter((r) => !r.ok).length,
        reels: report,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[render-batch] report → ${reportPath}`);

  const failed = report.filter((r) => !r.ok);
  if (failed.length > 0 || failures.length > 0) {
    console.error(
      `[render-batch] done with errors: ${failed.length} render failure(s), ${failures.length} invalid package(s)`,
    );
    process.exit(1);
  }
  console.log(`[render-batch] done — ${report.length} reel(s) OK`);
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
