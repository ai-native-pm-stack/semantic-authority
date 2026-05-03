import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import chalk from "chalk";
import { resolveDiff } from "../review/diff.js";
import { prefilter } from "../review/prefilter.js";
import { callJudge, resolveJudgeProvider } from "../review/judge.js";
import { aggregate, exitCodeFor } from "../review/aggregate.js";
import {
  createReviewCacheKey,
  defaultReviewCacheDir,
  formatReviewCacheKey,
  readReviewCache,
  writeReviewCache,
} from "../review/cache.js";
import { checkBudget, estimateCostUsd } from "../review/budget.js";
import { renderText } from "../review/render/text.js";
import { renderJson } from "../review/render/json.js";
import { renderSarif } from "../review/render/sarif.js";
import type { Constraint, MeaningDoc, ReviewResult, Severity } from "../review/types.js";

export interface ReviewOptions {
  surfaceName?: "review" | "drift";
  provider?: string;
  cache?: boolean;
  cacheDir?: string;
  meaning: string;
  base?: string;
  diff?: string;
  staged?: boolean;
  stdin?: boolean;
  model: string;
  format: "text" | "json" | "sarif";
  only?: string;
  failOn: Severity;
  maxFiles: string;
  budgetUsd: string;
  noColor?: boolean;
  verbose?: boolean;
  output?: string;
  sarifOutput?: string;
}

export async function reviewCommand(args: string[], options: ReviewOptions): Promise<void> {
  try {
    const surfaceName = options.surfaceName ?? "review";
    const stdinFlag = args.includes("-") || options.stdin;

    const meaningPath = resolve(options.meaning);
    if (!existsSync(meaningPath)) {
      fail(2, `MEANING.yaml not found at ${meaningPath}`, "Run `meaning init` to create one.");
    }
    const meaningContents = readFileSync(meaningPath, "utf-8");
    const doc = parseYaml(meaningContents) as MeaningDoc;
    if (!doc?.constraints || !Array.isArray(doc.constraints)) {
      fail(2, `MEANING.yaml has no constraints array.`);
    }

    const provider = resolveJudgeProvider(options.model, options.provider);
    const apiKeyEnv = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      fail(
        2,
        `${apiKeyEnv} environment variable is not set.`,
        provider === "openai"
          ? "Create an OpenAI API key and export it before running review."
          : "Get a key at https://console.anthropic.com and export it before running review."
      );
    }

    if (options.verbose) {
      console.error(chalk.dim(`[review] meaning: ${meaningPath}`));
      console.error(chalk.dim(`[review] provider:${provider}`));
      console.error(chalk.dim(`[review] model:   ${options.model}`));
    }

    const diff = await resolveDiff({
      base: options.base,
      diffFile: options.diff,
      staged: options.staged,
      stdin: stdinFlag,
    });

    if (diff.files.length === 0) {
      fail(2, "No changed files in diff.", "Nothing to review.");
    }

    const maxFiles = parseInt(options.maxFiles, 10);
    if (diff.files.length > maxFiles) {
      fail(
        2,
        `Diff has ${diff.files.length} files; --max-files is ${maxFiles}.`,
        "Split the change or raise --max-files."
      );
    }

    if (options.verbose) {
      console.error(chalk.dim(`[review] diff: ${diff.files.length} files, ${diff.totalLines} +/- lines (base ${diff.base})`));
    }

    const decisions = prefilter(doc.constraints as Constraint[], diff);
    const reviewedConstraints = decisions.filter((d) => d.matched).map((d) => d.constraint);

    if (options.verbose) {
      for (const d of decisions) {
        const tag = d.matched ? chalk.green("keep") : chalk.dim("skip");
        console.error(chalk.dim(`[prefilter] ${tag} ${d.constraint.id} — ${d.reason}`));
      }
    }

    if (reviewedConstraints.length === 0) {
      fail(2, "No constraints remain after pre-filter.", "This usually means MEANING.yaml has no constraints relevant to the diff.");
    }

    const cacheEnabled = options.cache !== false;
    const cacheDir = resolve(options.cacheDir ?? defaultReviewCacheDir());
    const cacheKey = createReviewCacheKey({
      provider,
      model: options.model,
      meaningContents,
      diff,
    });
    const cacheKeyString = formatReviewCacheKey(cacheKey);

    let judgeResult;
    let cacheHit = false;
    let cachedAt: string | undefined;
    let cacheSavedUsd = 0;

    const cached = cacheEnabled ? readReviewCache(cacheDir, cacheKey) : null;
    if (cached) {
      judgeResult = {
        findings: cached.findings,
        usage: cached.usage,
      };
      cacheHit = true;
      cachedAt = cached.createdAt;
      cacheSavedUsd = estimateCostUsd(options.model, cached.usage.inputTokens, cached.usage.outputTokens);
      if (options.verbose) {
        console.error(chalk.dim(`[cache] hit ${cacheKeyString}`));
      }
    } else {
      const budgetUsd = parseFloat(options.budgetUsd);
      const budget = checkBudget(options.model, reviewedConstraints, diff, budgetUsd);
      if (options.verbose) {
        console.error(
          chalk.dim(
            `[budget] est ${budget.estimatedInputTokens} in / ${budget.estimatedOutputTokens} out, ~$${budget.estimatedCostUsd.toFixed(4)} (cap $${budgetUsd.toFixed(2)})`
          )
        );
      }
      if (!budget.withinBudget) {
        fail(
          3,
          `Estimated cost $${budget.estimatedCostUsd.toFixed(4)} exceeds budget $${budgetUsd.toFixed(2)}.`,
          "Split the diff, raise --budget-usd, or use a cheaper --model."
        );
      }

      try {
        judgeResult = await callJudge(reviewedConstraints, diff, {
          provider,
          model: options.model,
          apiKey,
        });
      } catch (e) {
        fail(4, `LLM judge call failed: ${(e as Error).message}`);
      }

      if (cacheEnabled) {
        const writtenPath = writeReviewCache(cacheDir, cacheKey, {
          usage: judgeResult.usage,
          findings: judgeResult.findings,
        });
        if (options.verbose) {
          console.error(chalk.dim(`[cache] miss ${cacheKeyString}`));
          console.error(chalk.dim(`[cache] wrote ${writtenPath}`));
        }
      }
    }

    const aggregated = aggregate({
      rawFindings: judgeResult.findings,
      constraints: reviewedConstraints,
      diff,
    });

    if (options.verbose && aggregated.dropped.length > 0) {
      for (const d of aggregated.dropped) {
        console.error(chalk.dim(`[aggregate] dropped ${d.raw.constraint_id}: ${d.reason}`));
      }
    }

    const onlyFilter = options.only?.split(",").map((s) => s.trim()).filter(Boolean);
    const visibleFindings = onlyFilter
      ? aggregated.findings.filter((f) => onlyFilter.includes(f.severity))
      : aggregated.findings;

    const cost = estimateCostUsd(
      options.model,
      judgeResult.usage.inputTokens,
      judgeResult.usage.outputTokens
    );

    const result: ReviewResult = {
      commandName: surfaceName,
      meaningFile: options.meaning,
      system: doc.system,
      version: doc.version,
      judge: {
        provider,
        model: options.model,
        cacheHit,
        cacheKey: cacheKeyString,
        cachedAt,
      },
      diff: { base: diff.base, head: diff.head, files: diff.files.length, lines: diff.totalLines },
      findings: visibleFindings,
      stats: {
        constraintsTotal: doc.constraints.length,
        constraintsReviewed: reviewedConstraints.length,
        calls: cacheHit ? 0 : 1,
        inputTokens: judgeResult.usage.inputTokens,
        outputTokens: judgeResult.usage.outputTokens,
        costUsd: cacheHit ? 0 : cost,
        cacheSavedUsd: cacheHit ? cacheSavedUsd : undefined,
      },
      insufficientContext: aggregated.insufficientContext,
    };

    if (options.sarifOutput) {
      const sarif = renderSarif(result, reviewedConstraints);
      writeFileSync(resolve(options.sarifOutput), sarif);
      if (options.verbose) {
        console.error(chalk.dim(`[review] wrote sarif to ${options.sarifOutput}`));
      }
    }

    let output: string;
    if (options.format === "json") {
      output = renderJson(result);
    } else if (options.format === "sarif") {
      output = renderSarif(result, reviewedConstraints);
    } else {
      output = renderText(result, { noColor: options.noColor, commandName: surfaceName });
    }

    if (options.output) {
      writeFileSync(resolve(options.output), output);
      if (options.format === "text") console.log(output);
      else console.error(chalk.dim(`[review] wrote ${options.format} to ${options.output}`));
    } else {
      console.log(output);
    }

    process.exit(exitCodeFor(aggregated.findings, options.failOn));
  } catch (e) {
    if ((e as { __exitCode?: number }).__exitCode !== undefined) {
      process.exit((e as { __exitCode: number }).__exitCode);
    }
    console.error(chalk.red(`\n  Unexpected error: ${(e as Error).message}\n`));
    process.exit(2);
  }
}

function fail(code: number, message: string, hint?: string): never {
  console.error(chalk.red(`\n  ${message}`));
  if (hint) console.error(chalk.dim(`  ${hint}`));
  console.error("");
  const err = new Error(message) as Error & { __exitCode: number };
  err.__exitCode = code;
  throw err;
}
