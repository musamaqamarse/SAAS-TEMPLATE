import fs from "node:fs/promises";
import path from "node:path";

/** Recursively copy `src` into `dest`. If a file already exists, it's overwritten. */
export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isSymbolicLink()) {
      const target = await fs.readlink(from);
      await fs.symlink(target, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function ensureEmpty(dir: string): Promise<void> {
  if (await pathExists(dir)) {
    const items = await fs.readdir(dir);
    if (items.length > 0) {
      throw new Error(`Destination ${dir} already exists and is not empty.`);
    }
  } else {
    await fs.mkdir(dir, { recursive: true });
  }
}
