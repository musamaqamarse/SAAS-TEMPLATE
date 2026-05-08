/**
 * Tiny argv parser. We deliberately avoid a full CLI library — every flag
 * here corresponds to one field on `ScaffoldConfig` (or a small set of
 * lifecycle-command flags), the schema does validation, and there's no plugin
 * surface to expose.
 *
 * Top-level commands:
 *   <positional projectName>            scaffold (default)
 *   doctor                              toolchain check
 *   remove <role>                       remove an app role
 *   add <role>                          add an app role
 *   update                              run pending template migrations
 *   generate <unit> <name>              generate a unit (route/model/component/page)
 *
 * Scaffold flags (shared with the default command):
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
 *
 * Lifecycle flags (used by remove/add/update/generate):
 *   --variant <id>            for `add` (e.g. fastapi, nextjs-api)
 *   --target <folder>         for `generate` when multiple apps could host the unit
 *   --templates <dir>         override templates root (handy for test fixtures)
 *   --dry-run                 print the plan without applying changes
 *   --strict                  treat conflicts as failure (non-zero exit)
 *   --yes / -y                accept all defaults / skip confirmation prompts
 */
export type Command =
  | "scaffold"
  | "doctor"
  | "help"
  | "version"
  | "remove"
  | "add"
  | "update"
  | "generate";

export interface ParsedFlags {
  command: Command;
  /** First positional after the command name. For scaffold/remove/add: project name or role.
   *  For generate: the unit (route/model/component/page). */
  positional?: string;
  /** Second positional. For generate: the name of the thing to generate. */
  positional2?: string;
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

  // Lifecycle command flags
  variant?: string;
  target?: string;
  templatesDir?: string;
  dryRun?: boolean;
  strict?: boolean;
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
  "--variant",
  "--target",
  "--templates",
]);

const SUBCOMMANDS = new Set(["doctor", "remove", "add", "update", "generate"]);

export function parseArgs(argv: string[]): ParsedFlags {
  const out: ParsedFlags = { command: "scaffold", yes: false };

  if (argv.length === 0) return out;

  const first = argv[0];
  if (first === "--help" || first === "-h") return { ...out, command: "help" };
  if (first === "--version" || first === "-v") return { ...out, command: "version" };

  let i = 0;
  if (SUBCOMMANDS.has(first)) {
    out.command = first as Command;
    i = 1;
  }

  while (i < argv.length) {
    const a = argv[i];

    if (a === "--yes" || a === "-y") { out.yes = true; i++; continue; }
    if (a === "--no-infra") { out.includeInfra = false; i++; continue; }
    if (a === "--no-git") { out.initGit = false; i++; continue; }
    if (a === "--create-github-repos") { out.createGithubRepos = true; i++; continue; }
    if (a === "--public") { out.githubVisibility = "public"; i++; continue; }
    if (a === "--private") { out.githubVisibility = "private"; i++; continue; }
    if (a === "--dry-run") { out.dryRun = true; i++; continue; }
    if (a === "--strict") { out.strict = true; i++; continue; }

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
        case "--variant": out.variant = v; break;
        case "--target": out.target = v; break;
        case "--templates": out.templatesDir = v; break;
      }
      i += 2;
      continue;
    }

    if (a.startsWith("--")) {
      throw new Error(`Unknown flag: ${a}`);
    }

    // Positional. First wins → positional; second → positional2.
    if (out.positional == null) out.positional = a;
    else if (out.positional2 == null) out.positional2 = a;
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
