import { execFile } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";
import pc from "picocolors";

const exec = promisify(execFile);

interface Check {
  name: string;
  command: string;
  args: string[];
  required: boolean;
  fix: string;
  /** Optional: extract version string from stdout for display. */
  parseVersion?: (stdout: string) => string;
  /** Optional: minimum version (semver-ish, "major.minor"). */
  minVersion?: string;
}

const CHECKS: Check[] = [
  {
    name: "node",
    command: "node",
    args: ["--version"],
    required: true,
    minVersion: "20.0",
    fix: "Install Node.js 20+ from https://nodejs.org",
    parseVersion: (s) => s.trim().replace(/^v/, ""),
  },
  {
    name: "pnpm",
    command: "pnpm",
    args: ["--version"],
    required: true,
    minVersion: "9.0",
    fix: "Install pnpm: npm install -g pnpm@latest",
    parseVersion: (s) => s.trim(),
  },
  {
    name: "git",
    command: "git",
    args: ["--version"],
    required: true,
    fix: "Install git from https://git-scm.com",
    parseVersion: (s) => s.trim().replace(/^git version /, ""),
  },
  {
    name: "gh",
    command: "gh",
    args: ["--version"],
    required: false,
    fix: "Install GitHub CLI from https://cli.github.com (only needed for --create-github-repos)",
    parseVersion: (s) => s.split("\n")[0].replace(/^gh version /, ""),
  },
  {
    name: "python",
    command: process.platform === "win32" ? "python" : "python3",
    args: ["--version"],
    required: false,
    minVersion: "3.12",
    fix: "Install Python 3.12+ (only needed if you scaffold the FastAPI backend)",
    parseVersion: (s) => s.trim().replace(/^Python /, ""),
  },
  {
    name: "flutter",
    command: "flutter",
    args: ["--version"],
    required: false,
    fix: "Install Flutter 3.24+ from https://flutter.dev (only needed if you scaffold the Flutter mobile app)",
    parseVersion: (s) => {
      const m = s.match(/Flutter\s+([\d.]+)/);
      return m ? m[1] : s.split("\n")[0];
    },
  },
];

interface CheckResult {
  name: string;
  ok: boolean;
  required: boolean;
  version?: string;
  error?: string;
  fix: string;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

async function runCheck(c: Check): Promise<CheckResult> {
  try {
    const { stdout } = await exec(c.command, c.args, { windowsHide: true, shell: process.platform === "win32" });
    const version = c.parseVersion ? c.parseVersion(stdout) : stdout.trim().split("\n")[0];
    if (c.minVersion && compareSemver(version, c.minVersion) < 0) {
      return {
        name: c.name,
        ok: false,
        required: c.required,
        version,
        error: `version ${version} is below required ${c.minVersion}`,
        fix: c.fix,
      };
    }
    return { name: c.name, ok: true, required: c.required, version, fix: c.fix };
  } catch {
    return { name: c.name, ok: false, required: c.required, error: "not found on PATH", fix: c.fix };
  }
}

export async function runDoctor(): Promise<number> {
  console.log("");
  console.log(pc.bold(pc.cyan("create-saas doctor")) + pc.gray(" — checking your toolchain"));
  console.log("");

  const results = await Promise.all(CHECKS.map(runCheck));

  for (const r of results) {
    const tag = r.required ? pc.dim("(required)") : pc.dim("(optional)");
    if (r.ok) {
      console.log(`  ${pc.green("✓")} ${r.name.padEnd(8)} ${pc.gray(r.version ?? "")} ${tag}`);
    } else {
      const icon = r.required ? pc.red("✗") : pc.yellow("○");
      const detail = r.error ?? "missing";
      console.log(`  ${icon} ${r.name.padEnd(8)} ${pc.gray(detail)} ${tag}`);
      console.log(`     ${pc.dim("→ " + r.fix)}`);
    }
  }

  const requiredFailures = results.filter((r) => !r.ok && r.required).length;
  const optionalFailures = results.filter((r) => !r.ok && !r.required).length;

  console.log("");
  if (requiredFailures > 0) {
    console.log(pc.red(`${requiredFailures} required tool(s) missing or out of date.`));
    return 1;
  }
  if (optionalFailures > 0) {
    console.log(pc.yellow(`All required tools OK. ${optionalFailures} optional tool(s) missing — install only if you need that stack.`));
  } else {
    console.log(pc.green("All checks passed."));
  }
  return 0;
}
