#!/usr/bin/env node
/**
 * Walks templates/ and validates each _template.json against the Zod schema.
 * Exits non-zero on any failure so CI blocks PRs that introduce invalid metadata.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTemplateMeta } from "../src/scaffold.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const templatesRoot = path.join(repoRoot, "templates");

async function main() {
  const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
  const templateDirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(templatesRoot, e.name));

  let failures = 0;
  for (const dir of templateDirs) {
    const name = path.basename(dir);
    try {
      const meta = await loadTemplateMeta(dir);
      console.log(`  ✓ ${name}  (${meta.role}, ${meta.language}, supports: ${meta.supports.join("+")})`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}\n${(err as Error).message}`);
    }
  }

  console.log("");
  if (failures > 0) {
    console.error(`${failures} template(s) failed validation.`);
    process.exit(1);
  }
  console.log(`All ${templateDirs.length} template(s) valid.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
