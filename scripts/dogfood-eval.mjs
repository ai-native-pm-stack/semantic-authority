#!/usr/bin/env node

import { execFileSync, execSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseUnifiedDiff } from "../packages/cli/dist/review/diff.js";
import { prefilter } from "../packages/cli/dist/review/prefilter.js";
import { checkBudget } from "../packages/cli/dist/review/budget.js";

const require = createRequire(new URL("../packages/cli/package.json", import.meta.url));
const { parse: parseYaml } = require("yaml");

function main() {
  const opts = parseArgs(process.argv.slice(2));
  mkdirSync(resolve(opts.output, ".."), { recursive: true });

  const meaningDoc = parseYaml(readFileSync(opts.meaning, "utf-8"));
  const commitSelection = loadRecentCommitSamples(opts.repo, opts.count);
  const tempDir = mkdtempSync(join(tmpdir(), "meaning-dogfood-"));

  try {
    const samples = commitSelection.samples.map((sample) =>
      opts.mode === "live"
        ? runLiveSample({ ...opts, meaningDoc, sample, tempDir })
        : runEstimateSample({ ...opts, meaningDoc, sample })
    );

    const summary = summarize(samples, opts, commitSelection);
    const payload = maybeRedactPayload({
      generated_at: new Date().toISOString(),
      mode: opts.mode,
      project: opts.project || inferProjectName(opts.repo),
      repo: opts.repo,
      meaning: opts.meaning,
      provider: opts.provider,
      model: opts.model,
      requested_sample_count: opts.count,
      sample_count: samples.length,
      scanned_commits: commitSelection.scannedCommits,
      skipped_non_reviewable_commits: commitSelection.skippedNonReviewableCommits,
      summary,
      samples,
    }, opts.public);

    writeFileSync(opts.output, JSON.stringify(payload, null, 2));
    console.log(`Wrote dogfood evaluation to ${opts.output}`);
    console.log(renderSummary(summary, opts.mode));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const opts = {
    repo: "",
    meaning: "",
    project: "",
    count: 10,
    provider: "openai",
    model: "gpt-5.4-mini",
    mode: "estimate",
    public: false,
    noCache: false,
    output: "docs/evidence/dogfood-summary.json",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--repo") opts.repo = next, i++;
    else if (arg === "--meaning") opts.meaning = next, i++;
    else if (arg === "--project") opts.project = next, i++;
    else if (arg === "--count") opts.count = parseInt(next, 10), i++;
    else if (arg === "--provider") opts.provider = next, i++;
    else if (arg === "--model") opts.model = next, i++;
    else if (arg === "--mode") opts.mode = next, i++;
    else if (arg === "--public") opts.public = true;
    else if (arg === "--no-cache") opts.noCache = true;
    else if (arg === "--output") opts.output = next, i++;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!opts.repo || !opts.meaning) {
    printHelp();
    process.exit(2);
  }

  if (!["estimate", "live"].includes(opts.mode)) {
    throw new Error(`Unsupported mode: ${opts.mode}`);
  }

  return {
    ...opts,
    repo: resolve(opts.repo),
    meaning: resolve(opts.meaning),
    output: resolve(opts.output),
  };
}

function printHelp() {
  console.log(`Usage: node scripts/dogfood-eval.mjs --repo <path> --meaning <path> [options]

Options:
  --project <name>  Public project label for reports (default: repo folder name)
  --count <n>       Number of recent commits to sample (default: 10)
  --provider <id>   Judge provider for live mode (default: openai)
  --model <id>      Judge model id (default: gpt-5.4-mini)
  --mode <mode>     estimate | live (default: estimate)
  --public          Redact private repo identifiers in the output artifact
  --no-cache        Force fresh judge calls in live mode
  --output <path>   Output JSON path (default: docs/evidence/dogfood-summary.json)
`);
}

function inferProjectName(repoPath) {
  const normalized = resolve(repoPath);
  const parts = normalized.split("/");
  return parts[parts.length - 1] || normalized;
}

function maybeRedactPayload(payload, shouldRedact) {
  if (!shouldRedact) return payload;

  const { repo, meaning, samples, ...rest } = payload;
  return {
    ...rest,
    visibility: "public-redacted",
    samples: samples.map((sample, index) => redactSample(sample, index)),
  };
}

function redactSample(sample, index) {
  const { commit, findings_detail, judge, ...rest } = sample;
  return {
    sample_id: `sample_${String(index + 1).padStart(2, "0")}`,
    ...rest,
  };
}

function loadRecentCommitSamples(repo, count) {
  const scanLimit = Math.max(count * 20, 50);
  const out = execSync(`git -C ${shellEscape(repo)} log --format=%H -n ${scanLimit}`, {
    encoding: "utf-8",
  }).trim();
  const commits = out ? out.split("\n") : [];
  const samples = [];
  let skippedNonReviewableCommits = 0;

  for (const commit of commits) {
    if (samples.length >= count) break;
    const rawDiff = commitPatch(repo, commit);
    const files = parseUnifiedDiff(rawDiff);
    const totalLines = changedLineCount(files);

    if (!files.length || totalLines === 0) {
      skippedNonReviewableCommits += 1;
      continue;
    }

    samples.push({
      commit,
      rawDiff,
      files,
      totalLines,
    });
  }

  return {
    requestedCount: count,
    scannedCommits: commits.length,
    skippedNonReviewableCommits,
    samples,
  };
}

function runEstimateSample({ meaningDoc, model, sample }) {
  const diff = {
    base: `${sample.commit}^`,
    head: sample.commit,
    files: sample.files,
    totalLines: sample.totalLines,
  };
  const reviewedConstraints = prefilter(meaningDoc.constraints, diff)
    .filter((decision) => decision.matched)
    .map((decision) => decision.constraint);
  const budget = checkBudget(model, reviewedConstraints, diff, Number.POSITIVE_INFINITY);

  return {
    commit: sample.commit,
    mode: "estimate",
    files: diff.files.length,
    lines: diff.totalLines,
    constraints_reviewed: reviewedConstraints.length,
    estimated_input_tokens: budget.estimatedInputTokens,
    estimated_output_tokens: budget.estimatedOutputTokens,
    estimated_cost_usd: Number(budget.estimatedCostUsd.toFixed(4)),
  };
}

function runLiveSample({ repo, meaning, provider, model, sample, tempDir, noCache }) {
  const patchPath = join(tempDir, `${sample.commit}.diff`);
  writeFileSync(patchPath, sample.rawDiff);

  const cliPath = resolve("packages/cli/dist/index.js");
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "review",
      "--provider",
      provider,
      "--model",
      model,
      "--meaning",
      meaning,
      "--diff",
      patchPath,
      "--format",
      "json",
      "--no-color",
      ...(noCache ? ["--no-cache"] : []),
    ],
    {
      cwd: repo,
      encoding: "utf-8",
      env: process.env,
    }
  );
  const durationMs = Date.now() - started;

  if (result.status !== 0 && result.status !== 1) {
    return {
      commit,
      mode: "live",
      status: result.status,
      duration_ms: durationMs,
      error: (result.stderr || result.stdout || "").trim(),
    };
  }

  const parsed = JSON.parse(result.stdout);
  return {
    commit: sample.commit,
    mode: "live",
    status: result.status,
    duration_ms: durationMs,
    files: parsed.diff.files,
    lines: parsed.diff.lines,
    findings: parsed.findings.length,
    block_findings: parsed.findings.filter((finding) => finding.severity === "block").length,
    warn_findings: parsed.findings.filter((finding) => finding.severity === "warn").length,
    observe_findings: parsed.findings.filter((finding) => finding.severity === "observe").length,
    unclear: parsed.insufficient_context.length,
    cost_usd: parsed.stats.cost_usd,
    judge: parsed.judge,
    findings_detail: parsed.findings,
  };
}

function summarize(samples, opts, commitSelection) {
  const numeric = (field) =>
    samples.map((sample) => sample[field]).filter((value) => typeof value === "number");

  const summary = {
    mode: opts.mode,
    sample_count: samples.length,
    requested_sample_count: commitSelection.requestedCount,
    scanned_commits: commitSelection.scannedCommits,
    skipped_non_reviewable_commits: commitSelection.skippedNonReviewableCommits,
    files_avg: average(numeric("files")),
    lines_avg: average(numeric("lines")),
  };

  if (opts.mode === "estimate") {
    return {
      ...summary,
      constraints_reviewed_avg: average(numeric("constraints_reviewed")),
      estimated_cost_usd_avg: average(numeric("estimated_cost_usd")),
      estimated_cost_usd_p95: percentile(numeric("estimated_cost_usd"), 95),
      estimated_input_tokens_avg: average(numeric("estimated_input_tokens")),
    };
  }

  return {
    ...summary,
    successful_runs: samples.filter((sample) => sample.status === 0 || sample.status === 1).length,
    error_runs: samples.filter((sample) => sample.error).length,
    duration_ms_avg: average(numeric("duration_ms")),
    duration_ms_p95: percentile(numeric("duration_ms"), 95),
    cost_usd_avg: average(numeric("cost_usd")),
    cost_usd_p95: percentile(numeric("cost_usd"), 95),
    block_findings_total: sum(numeric("block_findings")),
    warn_findings_total: sum(numeric("warn_findings")),
    observe_findings_total: sum(numeric("observe_findings")),
    unclear_total: sum(numeric("unclear")),
  };
}

function renderSummary(summary, mode) {
  const lines = [
    `Mode: ${mode}`,
    `Samples: ${summary.sample_count}`,
    `Requested samples: ${summary.requested_sample_count}`,
    `Scanned commits: ${summary.scanned_commits}`,
    `Skipped non-reviewable commits: ${summary.skipped_non_reviewable_commits}`,
    `Average files changed: ${formatNumber(summary.files_avg)}`,
    `Average changed lines: ${formatNumber(summary.lines_avg)}`,
  ];

  if (mode === "estimate") {
    lines.push(`Average reviewed constraints: ${formatNumber(summary.constraints_reviewed_avg)}`);
    lines.push(`Average estimated cost: $${formatNumber(summary.estimated_cost_usd_avg, 4)}`);
    lines.push(`P95 estimated cost: $${formatNumber(summary.estimated_cost_usd_p95, 4)}`);
  } else {
    lines.push(`Successful runs: ${summary.successful_runs}`);
    lines.push(`Average duration: ${formatNumber(summary.duration_ms_avg)} ms`);
    lines.push(`P95 duration: ${formatNumber(summary.duration_ms_p95)} ms`);
    lines.push(`Average cost: $${formatNumber(summary.cost_usd_avg, 4)}`);
    lines.push(`P95 cost: $${formatNumber(summary.cost_usd_p95, 4)}`);
    lines.push(`Block findings total: ${summary.block_findings_total}`);
    lines.push(`Warn findings total: ${summary.warn_findings_total}`);
    lines.push(`Observe findings total: ${summary.observe_findings_total}`);
    lines.push(`Unclear findings total: ${summary.unclear_total}`);
  }

  return lines.join("\n");
}

function commitPatch(repo, commit) {
  return execSync(`git -C ${shellEscape(repo)} show --format= --unified=3 ${shellEscape(commit)}`, {
    encoding: "utf-8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function changedLineCount(files) {
  return files.reduce(
    (sum, file) =>
      sum +
      file.hunks.reduce(
        (hunkSum, hunk) =>
          hunkSum + hunk.lines.filter((line) => line.startsWith("+") || line.startsWith("-")).length,
        0
      ),
    0
  );
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function shellEscape(value) {
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

main();
