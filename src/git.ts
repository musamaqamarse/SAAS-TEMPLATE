import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pc from "picocolors";

const exec = promisify(execFile);

async function run(cmd: string, args: string[], cwd: string): Promise<void> {
  await exec(cmd, args, { cwd, windowsHide: true });
}

export async function gitInitAndCommit(repoDir: string, message: string): Promise<void> {
  await run("git", ["init", "-b", "main"], repoDir);
  await run("git", ["add", "."], repoDir);
  await run("git", ["commit", "-m", message], repoDir);
}

export async function ghCreateRepo(
  repoDir: string,
  repoName: string,
  visibility: "private" | "public",
  description: string
): Promise<string | null> {
  try {
    const { stdout } = await exec(
      "gh",
      [
        "repo", "create", repoName,
        `--${visibility}`,
        "--description", description,
        "--source", repoDir,
        "--remote", "origin",
        "--push",
      ],
      { cwd: repoDir, windowsHide: true }
    );
    return stdout.trim();
  } catch (err) {
    console.warn(pc.yellow(`  ! gh repo create failed for ${repoName}; skipping. (${(err as Error).message.split("\n")[0]})`));
    return null;
  }
}

export async function hasGh(): Promise<boolean> {
  try {
    await exec("gh", ["--version"], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function hasGit(): Promise<boolean> {
  try {
    await exec("git", ["--version"], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}
