/**
 * Generates `CLAUDE.md`, `agents.md`, and `.cursorrules` at the root of every
 * scaffolded project. Tuned to the specific stack combination so AI coding
 * tools (Claude Code, Cursor, Copilot, etc.) work brilliantly from minute one.
 *
 * The same content is written to all three files — they're consumed by
 * different tools but document the same stack assumptions, ports, env vars,
 * and conventions.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ScaffoldConfig } from "./schemas.js";
import type { ScaffoldedTemplate } from "./saas-config.js";

const AGENT_RULES_FILES = ["CLAUDE.md", "agents.md", ".cursorrules"] as const;

const PORTS = {
  "backend-fastapi": 8000,
  "backend-nextjs-api": 3000,
  "website-nextjs": 3000,
  "website-reactjs": 5173,
  "adminpanel-nextjs": 3001,
  "mobileapp-flutter": null,
} as const;

function backendBlock(cfg: ScaffoldConfig): string {
  if (cfg.backend === "fastapi") {
    return [
      "### Backend — FastAPI (Python)",
      "",
      `- Folder: \`${cfg.projectKebab}-backend/\``,
      "- Run locally: `uv sync && uv run uvicorn app.main:app --reload --port 8000`",
      "- Default port: 8000",
      "- Auth: verifies JWTs from the data stack; do not roll your own session layer.",
      `- Env: copy \`.env.example\` → \`.env\`. Required keys are validated at boot via Pydantic settings.`,
      "- Tests: `uv run pytest`. Add tests when you add routes.",
    ].join("\n");
  }
  if (cfg.backend === "nextjs-api") {
    return [
      "### Backend — Next.js API routes (TypeScript)",
      "",
      `- Folder: \`${cfg.projectKebab}-backend/\``,
      "- Run locally: `pnpm dev` (port 3000)",
      "- Auth: verifies JWTs from the data stack inside route handlers.",
      "- Env: copy `.env.local.example` → `.env.local`. Validated at boot via Zod.",
    ].join("\n");
  }
  return "";
}

function websiteBlock(cfg: ScaffoldConfig): string {
  if (cfg.website === "nextjs") {
    return [
      "### Website — Next.js (App Router, TypeScript)",
      "",
      `- Folder: \`${cfg.projectKebab}-website/\``,
      "- Run locally: `pnpm dev` (port 3000 — clashes with Next.js API backend; pick one or change the port)",
      "- Auth: client uses the data-stack SDK directly for sign-in; calls the backend with the resulting JWT.",
    ].join("\n");
  }
  if (cfg.website === "reactjs") {
    return [
      "### Website — React + Vite (TypeScript)",
      "",
      `- Folder: \`${cfg.projectKebab}-website/\``,
      "- Run locally: `pnpm dev` (port 5173)",
      "- Pure SPA. Talks to the backend via fetch.",
    ].join("\n");
  }
  return "";
}

function adminBlock(cfg: ScaffoldConfig): string {
  if (cfg.adminPanel !== "nextjs") return "";
  return [
    "### Admin panel — Next.js (TypeScript)",
    "",
    `- Folder: \`${cfg.projectKebab}-adminpanel/\``,
    "- Run locally: `pnpm dev -- -p 3001`",
    "- Guarded by an admin-role claim on the JWT. Do NOT expose admin actions through the public website.",
  ].join("\n");
}

function mobileBlock(cfg: ScaffoldConfig): string {
  if (cfg.mobile !== "flutter") return "";
  return [
    "### Mobile — Flutter (Dart)",
    "",
    `- Folder: \`${cfg.projectKebab}-mobileapp/\``,
    `- Bundle ID: \`${cfg.bundleId}\` (used for iOS/Android signing)`,
    "- Run locally: `flutter run` (with a simulator/device attached)",
    "- Push notifications wired via FCM out of the box.",
  ].join("\n");
}

function dataStackBlock(cfg: ScaffoldConfig): string {
  if (cfg.dataStack === "supabase") {
    return [
      "### Data / Auth — Supabase (Postgres + Auth + Storage)",
      "",
      "- Single source of truth for users, sessions, and row-level data.",
      "- Auth: Supabase Auth issues JWTs; backends verify with the project JWT secret.",
      "- DB access: prefer RLS policies. Service-role key stays server-side only — never ship it to clients.",
      cfg.includeInfra ? `- Migrations + RLS policies live in \`${cfg.projectKebab}-infra/\`. Apply with the Supabase CLI.` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    "### Data / Auth — Firebase (Firestore + Auth + Storage + FCM)",
    "",
    "- Auth: Firebase Auth issues ID tokens; backends verify with the Admin SDK.",
    "- Firestore rules + indexes are the security boundary — review them before shipping.",
    "- Service-account JSON stays server-side only.",
    cfg.includeInfra ? `- Rules + indexes live in \`${cfg.projectKebab}-infra/\`. Deploy with the Firebase CLI.` : "",
  ].filter(Boolean).join("\n");
}

function portsTable(scaffolded: ScaffoldedTemplate[]): string {
  const rows: string[] = [];
  for (const s of scaffolded) {
    const port = PORTS[s.meta.name as keyof typeof PORTS];
    if (port == null) continue;
    rows.push(`| ${s.meta.displayName} | \`${s.destFolderName}/\` | ${port} |`);
  }
  if (rows.length === 0) return "";
  return [
    "## Ports",
    "",
    "| App | Folder | Default port |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "Two Next.js apps will both want port 3000 — start them on different ports or run one at a time.",
  ].join("\n");
}

export function renderAgentRules(
  cfg: ScaffoldConfig,
  scaffolded: ScaffoldedTemplate[]
): string {
  const sections: string[] = [
    `# ${cfg.projectName}`,
    "",
    cfg.description,
    "",
    "This file documents the stack and conventions for AI coding assistants",
    "(Claude Code, Cursor, Copilot, etc.). Keep it accurate as the project evolves —",
    "every assistant reads it before suggesting code.",
    "",
    "## Stack at a glance",
    "",
    `- Data stack: **${cfg.dataStack}**`,
    `- Backend: **${cfg.backend}**`,
    `- Website: **${cfg.website}**`,
    `- Admin panel: **${cfg.adminPanel}**`,
    `- Mobile: **${cfg.mobile}**`,
    `- Bundle ID: \`${cfg.bundleId}\``,
    "",
    "## Apps",
    "",
    backendBlock(cfg),
    "",
    websiteBlock(cfg),
    "",
    adminBlock(cfg),
    "",
    mobileBlock(cfg),
    "",
    dataStackBlock(cfg),
    "",
    portsTable(scaffolded),
    "",
    "## Conventions",
    "",
    "- Each app folder is its own deployable. Don't import across folders — talk over HTTP.",
    "- Secrets live in per-app `.env` / `.env.local` files. Never commit them; `.env.example` documents the shape.",
    "- Generated by `create-saas`. Run `create-saas update` (when available) to pull template fixes; conflicts surface as merge markers, never silent overwrites.",
    "",
  ];
  return sections.filter((s) => s !== "").join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export async function writeAgentRules(
  destDir: string,
  cfg: ScaffoldConfig,
  scaffolded: ScaffoldedTemplate[]
): Promise<string[]> {
  const content = renderAgentRules(cfg, scaffolded);
  const written: string[] = [];
  for (const name of AGENT_RULES_FILES) {
    const p = path.join(destDir, name);
    await fs.writeFile(p, content, "utf8");
    written.push(p);
  }
  return written;
}

/** Stable sha256 of an agent-rules file's content. Recorded in saas.config.json
 *  so lifecycle commands can detect whether the user has hand-edited the file
 *  before deciding to overwrite or write a `.new` sibling. */
export function hashAgentRules(content: string): string {
  return "sha256:" + createHash("sha256").update(content).digest("hex");
}

/**
 * Re-render and persist agent rules during a lifecycle command. Behavior:
 *
 *   - If `expectedHash` is undefined → first time tracking; just write all
 *     three files and return the new hash.
 *   - If the file on disk matches `expectedHash` → safe to overwrite; write
 *     and return new hash.
 *   - If the file has drifted (user edited it) → write `<file>.new` next to
 *     the original instead of overwriting; return `{ drifted: true, ... }`
 *     so the CLI can surface the situation to the user.
 *
 * Drift is checked against `CLAUDE.md` only — the three files always have
 * identical content, so checking one is sufficient.
 */
export async function syncAgentRules(
  destDir: string,
  cfg: ScaffoldConfig,
  scaffolded: ScaffoldedTemplate[],
  expectedHash: string | undefined
): Promise<{ paths: string[]; newHash: string; drifted: boolean }> {
  const content = renderAgentRules(cfg, scaffolded);
  const newHash = hashAgentRules(content);

  // Drift check against CLAUDE.md — all three files share content, so one is enough.
  const probe = path.join(destDir, "CLAUDE.md");
  let drifted = false;
  if (expectedHash !== undefined) {
    try {
      const existing = await fs.readFile(probe, "utf8");
      if (hashAgentRules(existing) !== expectedHash) drifted = true;
    } catch {
      // missing file — treat as not drifted; we'll just write fresh copies.
    }
  }

  const written: string[] = [];
  for (const name of AGENT_RULES_FILES) {
    const target = drifted
      ? path.join(destDir, `${name}.new`)
      : path.join(destDir, name);
    await fs.writeFile(target, content, "utf8");
    written.push(target);
  }
  return { paths: written, newHash, drifted };
}
