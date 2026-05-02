#!/usr/bin/env node
/**
 * Regenerate `templates/mobileapp-flutter/_prerendered/` by running
 * `flutter create` with placeholder values and stripping anything the
 * `_common/` or per-stack overlays provide. Re-run after every Flutter SDK
 * bump and review the diff before committing.
 *
 * Placeholder values:
 *   --project-name placeholder_app
 *   --org           com.placeholder
 *   --platforms     android,ios
 *
 * The placeholders are substituted at scaffold time by the Flutter
 * post-process in `packages/core/src/scaffold.ts` (see
 * `applyFlutterPrerenderedSubstitutions`). If you change either side, change
 * both — the substitution is by literal string match.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const target = path.join(repoRoot, "templates", "mobileapp-flutter", "_prerendered");

/**
 * Files / directory globs we DO NOT include in the prerendered shell.
 * Reasons: provided by `_common/` or per-stack overlay (drift hazard),
 * machine-specific (.idea/, *.iml), or build artifacts.
 */
const EXCLUDE_RELATIVE = new Set([
  "lib/main.dart",                // _supabase/_firebase provide their own
  "pubspec.yaml",                 // _supabase/_firebase provide their own
  "pubspec.lock",                 // never commit
  "README.md",                    // _common provides
  "analysis_options.yaml",        // _common provides
  ".gitignore",                   // _common provides
  ".metadata",                    // machine-local
  "android/app/build.gradle.kts", // _common provides
  "test/widget_test.dart",        // _common can provide a tuned one if needed
  "android/local.properties",     // machine-local Android SDK path; never commit
]);

const EXCLUDE_DIRS = new Set([
  ".idea",
  ".dart_tool",
  ".vscode",
  "build",
  "ephemeral",                    // ios/Flutter/ephemeral — local build artifacts
]);

const EXCLUDE_FILE_GLOBS = [/\.iml$/];

async function rmrf(p: string) {
  await fs.rm(p, { recursive: true, force: true });
}

async function copyTreeFiltered(src: string, dest: string, baseSrc: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const rel = path.relative(baseSrc, from).split(path.sep).join("/");

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const to = path.join(dest, entry.name);
      await fs.mkdir(to, { recursive: true });
      count += await copyTreeFiltered(from, to, baseSrc);
      // remove dir if it ended up empty
      const remaining = await fs.readdir(to);
      if (remaining.length === 0) await fs.rmdir(to);
    } else if (entry.isFile()) {
      if (EXCLUDE_RELATIVE.has(rel)) continue;
      if (EXCLUDE_FILE_GLOBS.some((re) => re.test(entry.name))) continue;
      const to = path.join(dest, entry.name);
      await fs.copyFile(from, to);
      count++;
    }
  }
  return count;
}

async function main() {
  // Sanity-check Flutter is available.
  try {
    await execFileAsync("flutter", ["--version"], { shell: true });
  } catch {
    console.error("flutter not found on PATH. Install Flutter 3.24+ from https://flutter.dev and retry.");
    process.exit(1);
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cs-prerender-flutter-"));
  console.log(`Generating Flutter shell in ${tmp}…`);

  await execFileAsync(
    "flutter",
    [
      "create",
      "--project-name", "placeholder_app",
      "--org", "com.placeholder",
      "--platforms", "android,ios",
      "--template", "app",
      ".",
    ],
    { cwd: tmp, shell: true }
  );

  console.log(`Filtering and copying to ${path.relative(repoRoot, target)}…`);
  await rmrf(target);
  await fs.mkdir(target, { recursive: true });
  const fileCount = await copyTreeFiltered(tmp, target, tmp);

  await rmrf(tmp);

  console.log(`Wrote ${fileCount} file(s) to ${path.relative(repoRoot, target)}.`);
  console.log("Review the diff with `git diff templates/mobileapp-flutter/_prerendered/` before committing.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
