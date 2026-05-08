#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { mkdtempSync } from "node:fs";

const ROOT = resolve(".");
const DEFAULT_REPO = "/tmp/project-blinc-Blinc";
const DEFAULT_MEANING = resolve("docs/evidence/blinc/MEANING.yaml");
const DEFAULT_OUTPUT_DIR = resolve("docs/evidence/blinc/labeled");
const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_PROVIDER = "openai";

function main() {
  const opts = parseArgs(process.argv.slice(2));
  loadDotEnv(resolve(".env"));
  mkdirSync(opts.outputDir, { recursive: true });

  const caseResults = [];

  for (const definition of CASES) {
    const result = runCase(definition, opts);
    caseResults.push(result);
  }

  const summary = summarize(caseResults, opts);
  writeFileSync(
    resolve(opts.outputDir, "..", "blinc-labeled-eval.json"),
    JSON.stringify(summary, null, 2)
  );
  writeFileSync(resolve(opts.outputDir, "README.md"), renderMarkdown(summary));

  console.log(`Wrote labeled Blinc evaluation to ${resolve(opts.outputDir, "..", "blinc-labeled-eval.json")}`);
  console.log(`Wrote labeled Blinc report to ${resolve(opts.outputDir, "README.md")}`);
}

function parseArgs(argv) {
  const opts = {
    repo: DEFAULT_REPO,
    meaning: DEFAULT_MEANING,
    outputDir: DEFAULT_OUTPUT_DIR,
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL,
    noCache: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--repo") opts.repo = resolve(next), i++;
    else if (arg === "--meaning") opts.meaning = resolve(next), i++;
    else if (arg === "--output-dir") opts.outputDir = resolve(next), i++;
    else if (arg === "--provider") opts.provider = next, i++;
    else if (arg === "--model") opts.model = next, i++;
    else if (arg === "--cache") opts.noCache = false;
  }

  return opts;
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split("\n")) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [rawKey, ...rest] = line.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key]) continue;
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

function runCase(definition, opts) {
  const tempDir = mkdtempSync(join(tmpdir(), `blinc-labeled-${definition.id}-`));
  const origRoot = join(tempDir, "orig");
  const modRoot = join(tempDir, "mod");
  mkdirSync(origRoot, { recursive: true });
  mkdirSync(modRoot, { recursive: true });

  try {
    for (const relativePath of definition.files) {
      const sourcePath = resolve(opts.repo, relativePath);
      const origPath = resolve(origRoot, relativePath);
      const modPath = resolve(modRoot, relativePath);
      mkdirSync(dirname(origPath), { recursive: true });
      mkdirSync(dirname(modPath), { recursive: true });
      cpSync(sourcePath, origPath);
      cpSync(sourcePath, modPath);
    }

    definition.transform(modRoot);

    const rawDiff = gitDiffNoIndex(tempDir);
    const normalizedDiff = rawDiff
      .replaceAll("a/orig/", "a/")
      .replaceAll("b/mod/", "b/");

    const diffPath = resolve(opts.outputDir, `${definition.id}.diff`);
    writeFileSync(diffPath, normalizedDiff);

    const reviewJsonPath = resolve(opts.outputDir, `${definition.id}.review.json`);
    const sarifPath = definition.captureSarif
      ? resolve(opts.outputDir, `${definition.id}.sarif`)
      : undefined;

    const args = [
      resolve("packages/cli/dist/index.js"),
      "review",
      "--provider",
      opts.provider,
      "--model",
      opts.model,
      "--meaning",
      opts.meaning,
      "--diff",
      diffPath,
      "--format",
      "json",
    ];
    if (opts.noCache) args.push("--no-cache");
    if (sarifPath) args.push("--sarif-output", sarifPath);

    const run = spawnSync(process.execPath, args, {
      cwd: ROOT,
      env: process.env,
      encoding: "utf-8",
    });

    const output = (run.stdout || "").trim();
    const parsed = output ? JSON.parse(output) : null;
    const review = {
      status: run.status ?? 2,
      stdout: output,
      stderr: (run.stderr || "").trim(),
      parsed,
    };

    writeFileSync(reviewJsonPath, JSON.stringify(review, null, 2));

    const actualConstraintIds = parsed?.findings?.map((item) => item.constraint_id ?? item.constraintId) ?? [];
    const actualPositive = actualConstraintIds.length > 0;

    return {
      id: definition.id,
      title: definition.title,
      expected: definition.expected,
      files: definition.files,
      diffPath: relativeToRoot(diffPath),
      reviewJsonPath: relativeToRoot(reviewJsonPath),
      sarifPath: sarifPath ? relativeToRoot(sarifPath) : undefined,
      actual: {
        status: run.status ?? 2,
        positive: actualPositive,
        constraintIds: actualConstraintIds,
        insufficientContext: parsed?.insufficient_context?.map((item) => item.constraint_id ?? item.constraintId) ?? [],
        costUsd: parsed?.stats?.cost_usd ?? 0,
        provider: parsed?.judge?.provider ?? opts.provider,
        model: parsed?.judge?.model ?? opts.model,
      },
      outcome: scoreCase(definition.expected, {
        status: run.status ?? 2,
        positive: actualPositive,
        constraintIds: actualConstraintIds,
      }),
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function gitDiffNoIndex(tempDir) {
  try {
    return execFileSync(
      "git",
      ["diff", "--no-index", "--", "orig", "mod"],
      { cwd: tempDir, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? "";
    if (stdout) return stdout;
    throw error;
  }
}

function scoreCase(expected, actual) {
  if (actual.status !== 0 && actual.status !== 1) return "error";
  if (expected.positive && actual.positive) return "tp";
  if (expected.positive && !actual.positive) return "fn";
  if (!expected.positive && actual.positive) return "fp";
  return "tn";
}

function summarize(cases, opts) {
  const counts = { tp: 0, fn: 0, fp: 0, tn: 0, error: 0 };
  for (const item of cases) counts[item.outcome] += 1;

  const positive = counts.tp + counts.fn;
  const predictedPositive = counts.tp + counts.fp;
  const negative = counts.tn + counts.fp;

  return {
    generated_at: new Date().toISOString(),
    project: "Blinc",
    kind: "seeded-labeled-portability-eval",
    provider: opts.provider,
    model: opts.model,
    case_count: cases.length,
    summary: {
      tp: counts.tp,
      fn: counts.fn,
      fp: counts.fp,
      tn: counts.tn,
      error: counts.error,
      positive_cases: positive,
      negative_cases: negative,
      at_risk_recall: positive ? counts.tp / positive : null,
      at_risk_precision: predictedPositive ? counts.tp / predictedPositive : null,
      specificity: negative ? counts.tn / negative : null,
    },
    cases,
  };
}

function renderMarkdown(summary) {
  const fmtRatio = (value) => (value == null ? "undefined" : `${(value * 100).toFixed(0)}%`);
  return `# Blinc Seeded Labeled Eval

This directory contains a small **seeded labeled evaluation set** for the
ported Blinc benchmark. Each case is a synthetic diff against the public
Blinc repo, scored against an explicit expected outcome.

Configuration:

- provider: \`${summary.provider}\`
- model: \`${summary.model}\`
- cases: \`${summary.case_count}\`

Summary:

- true positives: \`${summary.summary.tp}\`
- false negatives: \`${summary.summary.fn}\`
- false positives: \`${summary.summary.fp}\`
- true negatives: \`${summary.summary.tn}\`
- at-risk recall: \`${fmtRatio(summary.summary.at_risk_recall)}\`
- at-risk precision: \`${fmtRatio(summary.summary.at_risk_precision)}\`
- specificity: \`${fmtRatio(summary.summary.specificity)}\`

This is a **small seeded eval**, not a comprehensive production truth set.
It is useful for measuring whether the current judge can recognize explicit,
named semantic regressions on a public repo with a ported \`MEANING.yaml\`.

## Cases

${summary.cases.map(renderCaseSection).join("\n\n")}
`;
}

function renderCaseSection(item) {
  return `### ${item.id} — ${item.title}

- expected: \`${item.expected.positive ? "at_risk" : "clean"}\`${item.expected.constraintIds?.length ? ` (${item.expected.constraintIds.join(", ")})` : ""}
- observed: \`${item.actual.positive ? "at_risk" : "clean"}\`${item.actual.constraintIds.length ? ` (${item.actual.constraintIds.join(", ")})` : ""}${item.actual.insufficientContext.length ? `; insufficient_context: ${item.actual.insufficientContext.join(", ")}` : ""}
- outcome: \`${item.outcome}\`
- diff: [${item.id}.diff](./${item.id}.diff)
- review output: [${item.id}.review.json](./${item.id}.review.json)${item.sarifPath ? `\n- SARIF: [${item.id}.sarif](./${item.id}.sarif)` : ""}`;
}

function relativeToRoot(path) {
  return path.replace(`${ROOT}/`, "");
}

const CASES = [
  {
    id: "01-web-parity-overclaim",
    title: "README overstates web parity and browser feature support",
    files: ["README.md"],
    expected: {
      positive: true,
      constraintIds: ["C-REL-WEB-TIER2-004", "NG-SCOPE-003", "NG-SCOPE-006"],
    },
    captureSarif: true,
    transform(modRoot) {
      const path = resolve(modRoot, "README.md");
      const text = readFileSync(path, "utf-8").replace(
        "| **Web (WASM)** | **Preview** | wgpu (WebGPU) — Chrome 113+, Edge 113+, Firefox 141+, Safari 18+ (macOS Tahoe) |\n",
        "| **Web (WASM)** | **Stable** | Full parity across all major browsers with system tray, notifications, global hotkeys, and complete feature support |\n"
      );
      writeFileSync(path, text);
    },
  },
  {
    id: "02-accessibility-overclaim",
    title: "Roadmap claims full accessibility parity across all targets",
    files: ["README.md"],
    expected: {
      positive: true,
      constraintIds: ["NG-SCOPE-005"],
    },
    transform(modRoot) {
      const path = resolve(modRoot, "README.md");
      const text = readFileSync(path, "utf-8").replace(
        "3. Accessibility (screen reader, keyboard navigation)\n",
        "3. Accessibility is complete across all targets, including full screen reader parity\n"
      );
      writeFileSync(path, text);
    },
  },
  {
    id: "03-codec-policy-reversal",
    title: "Roadmap reverses royalty-free codec policy",
    files: ["ROADMAP.md"],
    expected: {
      positive: true,
      constraintIds: ["C-COMPLIANCE-ROYALTY-FREE-002"],
    },
    transform(modRoot) {
      const path = resolve(modRoot, "ROADMAP.md");
      const text = readFileSync(path, "utf-8").replace(
        "> **Licensing**: Desktop uses royalty-free codecs only — OpenH264 (Cisco's BSD, patent costs covered by Cisco), VP9, AV1, Opus, Vorbis. No ffmpeg, no patent-encumbered codecs.\n",
        "> **Licensing**: Desktop media will standardize on ffmpeg and other patent-encumbered codecs to speed up H.264/H.265 playback support.\n"
      );
      writeFileSync(path, text);
    },
  },
  {
    id: "04-install-doc-drift",
    title: "Installation docs drift below the shipped Rust and crate version",
    files: ["docs/book/src/getting-started/installation.md"],
    expected: {
      positive: true,
      constraintIds: ["C-OPS-DOCS-PARITY-007"],
    },
    transform(modRoot) {
      const path = resolve(modRoot, "docs/book/src/getting-started/installation.md");
      let text = readFileSync(path, "utf-8");
      text = text.replace("**Rust 1.70+**", "**Rust 1.60+**");
      text = text.replace('blinc_app = { version = "0.1", features = ["windowed"] }', 'blinc_app = { version = "0.0.5", features = ["windowed"] }');
      writeFileSync(path, text);
    },
  },
  {
    id: "05-negative-control-copyedit",
    title: "Benign README copy edit",
    files: ["README.md"],
    expected: {
      positive: false,
      constraintIds: [],
    },
    transform(modRoot) {
      const path = resolve(modRoot, "README.md");
      const text = readFileSync(path, "utf-8").replace(
        "**[Live Example Gallery](https://project-blinc.github.io/Blinc/web/example-gallery.html)** — 40+ interactive WebGPU demos running in your browser.\n",
        "**[Live Example Gallery](https://project-blinc.github.io/Blinc/web/example-gallery.html)** — 40+ interactive WebGPU demos running in a WebGPU-capable browser.\n"
      );
      writeFileSync(path, text);
    },
  },
];

main();
