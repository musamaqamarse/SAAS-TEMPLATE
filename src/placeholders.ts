import fs from "node:fs/promises";
import path from "node:path";
import { ScaffoldConfig } from "./types.js";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mdx",
  ".py", ".toml", ".cfg", ".ini",
  ".dart", ".yaml", ".yml",
  ".html", ".css", ".scss", ".sass",
  ".env", ".example", ".sample",
  ".txt", ".sh", ".bat", ".ps1",
  ".sql", ".rules", ".indexes",
  ".gitignore", ".dockerignore", ".gitattributes", ".npmrc",
  ".xml", ".plist", ".gradle", ".kts", ".properties",
]);

const BINARY_HINT_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
  ".woff", ".woff2", ".ttf", ".otf",
  ".mp4", ".mp3", ".wav",
  ".zip", ".tar", ".gz",
  ".jar", ".keystore", ".jks",
]);

function isLikelyText(filePath: string): boolean {
  const base = path.basename(filePath);
  // dotfiles without extension (.gitignore, .env)
  if (base.startsWith(".") && !base.includes(".", 1)) return true;
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_HINT_EXTENSIONS.has(ext)) return false;
  if (TEXT_EXTENSIONS.has(ext)) return true;
  // Files with no extension — assume text (Dockerfile, Makefile, etc.)
  if (!ext) return true;
  return false;
}

export function buildReplacements(cfg: ScaffoldConfig): Array<[RegExp, string]> {
  return [
    [/__PROJECT_NAME__/g, cfg.projectName],
    [/__PROJECT_KEBAB__/g, cfg.projectKebab],
    [/__PROJECT_SNAKE__/g, cfg.projectSnake],
    [/__PROJECT_PASCAL__/g, cfg.projectPascal],
    [/__BUNDLE_ID__/g, cfg.bundleId],
    [/__DESCRIPTION__/g, cfg.description],
  ];
}

export function applyReplacements(input: string, replacements: Array<[RegExp, string]>): string {
  let out = input;
  for (const [pattern, value] of replacements) {
    out = out.replace(pattern, value);
  }
  return out;
}

/** Walk a directory and apply placeholder replacement to all text files AND filenames. */
export async function processTreePlaceholders(root: string, cfg: ScaffoldConfig): Promise<void> {
  const replacements = buildReplacements(cfg);

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const original = path.join(dir, entry.name);
      const renamed = applyReplacements(entry.name, replacements);
      const finalPath = path.join(dir, renamed);
      if (renamed !== entry.name) {
        await fs.rename(original, finalPath);
      }

      if (entry.isDirectory()) {
        await walk(finalPath);
      } else if (entry.isFile() && isLikelyText(finalPath)) {
        try {
          const content = await fs.readFile(finalPath, "utf8");
          const next = applyReplacements(content, replacements);
          if (next !== content) {
            await fs.writeFile(finalPath, next, "utf8");
          }
        } catch {
          // Skip unreadable files silently — they're probably binary mis-detected.
        }
      }
    }
  }

  await walk(root);
}
