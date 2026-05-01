import fs from "node:fs/promises";
import path from "node:path";
import type { ScaffoldConfig, SaasProjectConfig, TemplateMeta } from "./schemas.js";

export interface ScaffoldedTemplate {
  meta: TemplateMeta;
  destFolderName: string;
}

/**
 * Build the persisted project config that gets written to `saas.config.json`
 * at the project root. This is the contract every lifecycle command (`update`,
 * `add`, `remove`) reads from to know what the project actually is.
 *
 * Strips scaffolding-time intent (initGit, createGithubRepos, githubVisibility,
 * destDir) — those describe the act of creation, not the project.
 */
export function buildSaasProjectConfig(
  cfg: ScaffoldConfig,
  scaffolded: ScaffoldedTemplate[],
  cliVersion: string
): SaasProjectConfig {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    cliVersion,
    project: {
      name: cfg.projectName,
      kebab: cfg.projectKebab,
      snake: cfg.projectSnake,
      pascal: cfg.projectPascal,
      bundleId: cfg.bundleId,
      description: cfg.description,
    },
    composition: {
      dataStack: cfg.dataStack,
      backend: cfg.backend,
      website: cfg.website,
      adminPanel: cfg.adminPanel,
      mobile: cfg.mobile,
      includeInfra: cfg.includeInfra,
    },
    templates: scaffolded.map((s) => ({
      name: s.meta.name,
      role: s.meta.role,
      version: s.meta.version ?? "0.0.0",
      folder: s.destFolderName,
    })),
  };
}

export async function writeSaasConfig(
  destDir: string,
  config: SaasProjectConfig
): Promise<string> {
  const filePath = path.join(destDir, "saas.config.json");
  await fs.writeFile(filePath, JSON.stringify(config, null, 2) + "\n", "utf8");
  return filePath;
}
