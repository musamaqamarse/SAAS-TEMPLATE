/**
 * Tiny argv parser. We deliberately avoid a full CLI library — every flag
 * here corresponds to one field on `ScaffoldConfig`, the schema does
 * validation, and there's no plugin surface to expose.
 *
 * Supports:
 *   <positional projectName>
 *   --config <path>           load a JSON ScaffoldConfig (overridden by other flags)
 *   --name <text>             same as positional
 *   --description <text>
 *   --data-stack <supabase|firebase>
 *   --backend <fastapi|nextjs-api|none>
 *   --website <nextjs|reactjs|none>
 *   --admin <nextjs|none>
 *   --mobile <flutter|none>
 *   --bundle-vendor <com.x>
 *   --out <dir>               destination directory (default ./<kebab>)
 *   --no-infra
 *   --no-git
 *   --create-github-repos
 *   --public                  GitHub repo visibility (default private)
 *   --yes / -y                accept all defaults; skip prompts entirely
 */
export interface ParsedFlags {
  command: "scaffold" | "doctor" | "help" | "version";
  positional?: string;
  configPath?: string;
  yes: boolean;

  name?: string;
  description?: string;
  dataStack?: string;
  backend?: string;
  website?: string;
  admin?: string;
  mobile?: string;
  bundleVendor?: string;
  out?: string;

  includeInfra?: boolean;
  initGit?: boolean;
  createGithubRepos?: boolean;
  githubVisibility?: "private" | "public";
}

const VALUE_FLAGS = new Set([
  "--config",
  "--name",
  "--description",
  "--data-stack",
  "--backend",
  "--website",
  "--admin",
  "--mobile",
  "--bundle-vendor",
  "--out",
]);

export function parseArgs(argv: string[]): ParsedFlags {
  const out: ParsedFlags = { command: "scaffold", yes: false };

  if (argv.length === 0) return out;

  const first = argv[0];
  if (first === "--help" || first === "-h") return { ...out, command: "help" };
  if (first === "--version" || first === "-v") return { ...out, command: "version" };
  if (first === "doctor") return { ...out, command: "doctor" };

  let i = 0;
  while (i < argv.length) {
    const a = argv[i];

    if (a === "--yes" || a === "-y") { out.yes = true; i++; continue; }
    if (a === "--no-infra") { out.includeInfra = false; i++; continue; }
    if (a === "--no-git") { out.initGit = false; i++; continue; }
    if (a === "--create-github-repos") { out.createGithubRepos = true; i++; continue; }
    if (a === "--public") { out.githubVisibility = "public"; i++; continue; }
    if (a === "--private") { out.githubVisibility = "private"; i++; continue; }

    if (VALUE_FLAGS.has(a)) {
      const v = argv[i + 1];
      if (v == null || v.startsWith("--")) {
        throw new Error(`Flag ${a} expects a value.`);
      }
      switch (a) {
        case "--config": out.configPath = v; break;
        case "--name": out.name = v; break;
        case "--description": out.description = v; break;
        case "--data-stack": out.dataStack = v; break;
        case "--backend": out.backend = v; break;
        case "--website": out.website = v; break;
        case "--admin": out.admin = v; break;
        case "--mobile": out.mobile = v; break;
        case "--bundle-vendor": out.bundleVendor = v; break;
        case "--out": out.out = v; break;
      }
      i += 2;
      continue;
    }

    if (a.startsWith("--")) {
      throw new Error(`Unknown flag: ${a}`);
    }

    // Positional — first one wins (project name).
    if (out.positional == null) out.positional = a;
    i++;
  }

  return out;
}

/**
 * True iff the user supplied enough flags to skip all prompts. Any field the
 * caller didn't pin down is filled with a sensible default.
 */
export function canRunNonInteractive(flags: ParsedFlags): boolean {
  if (flags.configPath) return true;
  if (flags.yes && (flags.positional || flags.name)) return true;
  return false;
}
