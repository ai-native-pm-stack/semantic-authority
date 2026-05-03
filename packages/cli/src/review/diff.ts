import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
  let sourceKind: "stdin" | "patch" | "staged" | "git" = "git";

  if (opts.stdin) {
    raw = opts.stdinContent ?? (await readStdin());
    base = "stdin";
    head = "stdin";
    sourceKind = "stdin";
  } else if (opts.diffFile) {
    raw = readFileSync(opts.diffFile, "utf-8");
    base = opts.diffFile;
    head = "patch";
    sourceKind = "patch";
  } else if (opts.staged) {
    raw = git(["diff", "--staged", "--unified=3", "--no-color"]);
    base = "staged";
    head = "working-tree";
    sourceKind = "staged";
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

  const files = hydrateFileContext(parseUnifiedDiff(raw), {
    base,
    sourceKind,
  });
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

export function diffToText(diff: Diff, maxLinesPerFile = 1500, maxTotalLines = 6000): string {
  const parts: string[] = [];
  let remainingLines = maxTotalLines;
  for (const f of diff.files) {
    if (remainingLines <= 0) {
      parts.push(`diff for ${f.path} omitted (global diff line cap reached)`);
      continue;
    }

    const patchLines = f.rawPatch.split("\n");
    const take = Math.min(maxLinesPerFile, remainingLines, patchLines.length);
    const patch = patchLines.slice(0, take).join("\n");
    remainingLines -= take;

    const truncated =
      patchLines.length > take
        ? `\n... diff truncated for ${f.path} (${patchLines.length - take} lines omitted)`
        : "";

    parts.push(patch + truncated);
  }
  return parts.join("\n");
}

export function fileContextToText(
  diff: Diff,
  maxFullFileLines = 800,
  maxTotalChars = 120_000
): string {
  const sections: string[] = [];
  let remainingChars = maxTotalChars;

  for (const file of diff.files) {
    if (remainingChars <= 0) {
      sections.push(
        `## ${file.path}\n` +
          `status: ${file.status}\n` +
          "full_file_context: omitted (global context cap reached)\n"
      );
      continue;
    }

    if (!file.fullText) {
      const section =
        `## ${file.path}\n` +
          `status: ${file.status}\n` +
          `full_file_context: unavailable\n`;
      sections.push(section);
      remainingChars -= section.length;
      continue;
    }

    const lineCount = file.fullText.split("\n").length;
    if (lineCount > maxFullFileLines) {
      const section =
        `## ${file.path}\n` +
          `status: ${file.status}\n` +
          `full_file_context: omitted (${lineCount} lines > ${maxFullFileLines} line cap)\n`;
      sections.push(section);
      remainingChars -= section.length;
      continue;
    }

    const section =
      `## ${file.path}\n` +
        `status: ${file.status}\n` +
        `full_file_context: included (${lineCount} lines)\n` +
        "```text\n" +
        file.fullText +
        "\n```";

    if (section.length > remainingChars) {
      const omitted =
        `## ${file.path}\n` +
        `status: ${file.status}\n` +
        "full_file_context: omitted (global context cap reached)\n";
      sections.push(omitted);
      remainingChars -= omitted.length;
      continue;
    }

    sections.push(section);
    remainingChars -= section.length;
  }

  return sections.join("\n\n");
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

export function findDiffFile(diff: Diff, path: string): FileDiff | undefined {
  return diff.files.find((file) => file.path === path || file.oldPath === path);
}

export function lineTouchesDiffHunk(file: FileDiff, line: number): boolean {
  if (!Number.isInteger(line) || line < 1) return false;

  return file.hunks.some((hunk) => {
    const start = hunk.newStart;
    const span = Math.max(hunk.newLines, 1);
    const end = start + span - 1;
    return line >= start && line <= end;
  });
}

function hydrateFileContext(
  files: FileDiff[],
  opts: { base: string; sourceKind: "stdin" | "patch" | "staged" | "git" }
): FileDiff[] {
  return files.map((file) => ({
    ...file,
    fullText: readFileContext(file, opts),
  }));
}

function readFileContext(
  file: FileDiff,
  opts: { base: string; sourceKind: "stdin" | "patch" | "staged" | "git" }
): string | undefined {
  if (file.status !== "deleted" && existsSync(file.path)) {
    return readFileSync(file.path, "utf-8");
  }

  if (file.oldPath && existsSync(file.oldPath)) {
    return readFileSync(file.oldPath, "utf-8");
  }

  if (file.status === "deleted" && file.oldPath && opts.sourceKind === "git") {
    try {
      return git(["show", `${opts.base}:${file.oldPath}`]);
    } catch {
      return undefined;
    }
  }

  return undefined;
}
