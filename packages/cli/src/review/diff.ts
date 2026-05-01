import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Diff, FileDiff, DiffHunk } from "./types.js";

export interface DiffSourceOptions {
  base?: string;
  diffFile?: string;
  staged?: boolean;
  stdin?: boolean;
  stdinContent?: string;
}

export async function resolveDiff(opts: DiffSourceOptions): Promise<Diff> {
  let raw: string;
  let base = opts.base ?? "main";
  let head = "HEAD";

  if (opts.stdin) {
    raw = opts.stdinContent ?? (await readStdin());
    base = "stdin";
    head = "stdin";
  } else if (opts.diffFile) {
    raw = readFileSync(opts.diffFile, "utf-8");
    base = opts.diffFile;
    head = "patch";
  } else if (opts.staged) {
    raw = git(["diff", "--staged", "--unified=3", "--no-color"]);
    base = "staged";
    head = "working-tree";
  } else {
    const resolvedBase = resolveBase(base);
    base = resolvedBase;
    raw = git([
      "diff",
      `${resolvedBase}...HEAD`,
      "--unified=3",
      "--no-color",
    ]);
  }

  const files = parseUnifiedDiff(raw);
  const totalLines = files.reduce(
    (sum, f) =>
      sum +
      f.hunks.reduce(
        (s, h) =>
          s + h.lines.filter((l) => l.startsWith("+") || l.startsWith("-")).length,
        0
      ),
    0
  );

  return { base, head, files, totalLines };
}

function git(args: string[]): string {
  try {
    return execSync(`git ${args.map(shellEscape).join(" ")}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    const err = e as { stderr?: Buffer; message: string };
    const stderr = err.stderr ? err.stderr.toString() : "";
    throw new Error(`git ${args[0]} failed: ${stderr || err.message}`);
  }
}

function shellEscape(s: string): string {
  if (/^[a-zA-Z0-9_./@:=-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function resolveBase(base: string): string {
  // Try merge-base; if it fails, fall back to the literal base.
  try {
    const mergeBase = execSync(`git merge-base ${shellEscape(base)} HEAD`, {
      encoding: "utf-8",
    }).trim();
    return mergeBase;
  } catch {
    return base;
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

export function parseUnifiedDiff(raw: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("diff --git")) {
      i++;
      continue;
    }

    const headerStart = i;
    let oldPath: string | undefined;
    let newPath: string | undefined;
    let status: FileDiff["status"] = "modified";
    i++;

    while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].startsWith("diff --git")) {
      const l = lines[i];
      if (l.startsWith("new file mode")) status = "added";
      else if (l.startsWith("deleted file mode")) status = "deleted";
      else if (l.startsWith("rename from")) status = "renamed";
      else if (l.startsWith("--- ")) {
        const p = l.slice(4).trim();
        oldPath = p === "/dev/null" ? undefined : p.replace(/^a\//, "");
      } else if (l.startsWith("+++ ")) {
        const p = l.slice(4).trim();
        newPath = p === "/dev/null" ? undefined : p.replace(/^b\//, "");
      }
      i++;
    }

    const path = newPath ?? oldPath ?? extractPathFromGitHeader(lines[headerStart]);
    if (!path) {
      i++;
      continue;
    }

    const hunks: DiffHunk[] = [];
    const patchLines: string[] = lines.slice(headerStart, i);

    while (i < lines.length && lines[i].startsWith("@@")) {
      const hunkHeader = lines[i];
      const m = hunkHeader.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!m) {
        i++;
        continue;
      }
      const oldStart = parseInt(m[1], 10);
      const oldLines = m[2] ? parseInt(m[2], 10) : 1;
      const newStart = parseInt(m[3], 10);
      const newLines = m[4] ? parseInt(m[4], 10) : 1;
      i++;

      const hunkBody: string[] = [];
      while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].startsWith("diff --git")) {
        hunkBody.push(lines[i]);
        patchLines.push(lines[i]);
        i++;
      }

      hunks.push({ oldStart, oldLines, newStart, newLines, lines: hunkBody });
    }

    files.push({
      path,
      oldPath: oldPath !== newPath ? oldPath : undefined,
      status,
      hunks,
      rawPatch: patchLines.join("\n"),
    });
  }

  return files;
}

function extractPathFromGitHeader(line: string): string | undefined {
  const m = line.match(/^diff --git a\/(.+) b\/(.+)$/);
  return m ? m[2] : undefined;
}

export function diffToText(diff: Diff, maxLinesPerFile = 1500): string {
  const parts: string[] = [];
  for (const f of diff.files) {
    const patch = f.rawPatch.split("\n").slice(0, maxLinesPerFile).join("\n");
    parts.push(patch);
  }
  return parts.join("\n");
}

export function changedLineNumbers(file: FileDiff): number[] {
  const numbers: number[] = [];
  for (const h of file.hunks) {
    let n = h.newStart;
    for (const l of h.lines) {
      if (l.startsWith("+") && !l.startsWith("+++")) {
        numbers.push(n);
        n++;
      } else if (l.startsWith(" ")) {
        n++;
      }
    }
  }
  return numbers;
}
