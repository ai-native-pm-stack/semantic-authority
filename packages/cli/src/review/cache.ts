import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Diff, JudgeFindingRaw, JudgeProvider, JudgeUsage } from "./types.js";

const CACHE_VERSION = "1";

export interface ReviewCacheKey {
  provider: JudgeProvider;
  model: string;
  diffHash: string;
  meaningHash: string;
}

export interface ReviewCacheEntry {
  version: string;
  provider: JudgeProvider;
  model: string;
  diffHash: string;
  meaningHash: string;
  createdAt: string;
  usage: JudgeUsage;
  findings: JudgeFindingRaw[];
}

export function defaultReviewCacheDir(cwd = process.cwd()): string {
  return resolve(cwd, ".meaning-cache", "review");
}

export function createReviewCacheKey(input: {
  provider: JudgeProvider;
  model: string;
  meaningContents: string;
  diff: Diff;
}): ReviewCacheKey {
  return {
    provider: input.provider,
    model: input.model,
    diffHash: sha256(input.diff.files.map((file) => file.rawPatch).join("\n")),
    meaningHash: sha256(input.meaningContents),
  };
}

export function readReviewCache(cacheDir: string, key: ReviewCacheKey): ReviewCacheEntry | null {
  const path = cacheFilePath(cacheDir, key);
  if (!existsSync(path)) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as ReviewCacheEntry;
    if (
      parsed.version !== CACHE_VERSION ||
      parsed.provider !== key.provider ||
      parsed.model !== key.model ||
      parsed.diffHash !== key.diffHash ||
      parsed.meaningHash !== key.meaningHash ||
      !Array.isArray(parsed.findings)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeReviewCache(
  cacheDir: string,
  key: ReviewCacheKey,
  entry: { usage: JudgeUsage; findings: JudgeFindingRaw[] }
): string {
  const path = cacheFilePath(cacheDir, key);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        version: CACHE_VERSION,
        provider: key.provider,
        model: key.model,
        diffHash: key.diffHash,
        meaningHash: key.meaningHash,
        createdAt: new Date().toISOString(),
        usage: entry.usage,
        findings: entry.findings,
      } satisfies ReviewCacheEntry,
      null,
      2
    )
  );
  return path;
}

export function formatReviewCacheKey(key: ReviewCacheKey): string {
  return `${key.provider}:${key.model}:${key.meaningHash}:${key.diffHash}`;
}

function cacheFilePath(cacheDir: string, key: ReviewCacheKey): string {
  return resolve(
    cacheDir,
    key.provider,
    sanitizePathSegment(key.model),
    key.meaningHash,
    `${key.diffHash}.json`
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
