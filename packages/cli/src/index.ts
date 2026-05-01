#!/usr/bin/env node

import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { initCommand } from "./commands/init.js";
import { contextCommand } from "./commands/context.js";
import { reviewCommand } from "./commands/review.js";

const program = new Command();

program
  .name("meaning")
  .description(
    "Semantic Authority CLI — validate, enforce, and generate agent context from MEANING.yaml"
  )
  .version("0.1.0");

program
  .command("init")
  .description("Create a new MEANING.yaml with interactive prompts")
  .option("-d, --dir <path>", "Directory to create MEANING.yaml in", ".")
  .option("--non-interactive", "Use defaults without prompting")
  .action(initCommand);

program
  .command("validate")
  .description("Validate MEANING.yaml against the schema")
  .option("-f, --file <path>", "Path to MEANING.yaml", "./MEANING.yaml")
  .option("--strict", "Treat warnings as errors")
  .action(validateCommand);

program
  .command("context")
  .description(
    "Generate .claude/meaning-context.md from MEANING.yaml for agent consumption"
  )
  .option("-f, --file <path>", "Path to MEANING.yaml", "./MEANING.yaml")
  .option(
    "-o, --output <path>",
    "Output path for context file",
    "./.claude/meaning-context.md"
  )
  .action(contextCommand);

program
  .command("review")
  .description(
    "Review a code diff against MEANING.yaml using an LLM judge; flag constraint risk with cited IDs"
  )
  .argument("[stdin]", "Pass '-' to read diff from stdin")
  .option("-f, --meaning <path>", "Path to MEANING.yaml", "./MEANING.yaml")
  .option("-b, --base <ref>", "Base ref to diff against (default: merge-base with main)")
  .option("-d, --diff <path>", "Read unified diff from a file")
  .option("--staged", "Review staged changes only")
  .option("--stdin", "Read unified diff from stdin")
  .option("-m, --model <id>", "Anthropic model id", "claude-opus-4-7")
  .option("--format <fmt>", "Output format: text | json | sarif", "text")
  .option("--only <levels>", "Comma-separated severity filter (block,warn,observe)")
  .option("--fail-on <level>", "Exit non-zero threshold: block | warn | observe", "block")
  .option("--max-files <n>", "Cap on files in a single review run", "50")
  .option("--budget-usd <n>", "Abort before API call if estimate exceeds this", "1.00")
  .option("-o, --output <path>", "Write rendered output to a file")
  .option("--no-color", "Disable ANSI colors in text output")
  .option("--verbose", "Print pre-filter and budget diagnostics to stderr")
  .action((stdinArg: string | undefined, opts: Record<string, unknown>) => {
    const args = stdinArg ? [stdinArg] : [];
    return reviewCommand(args, {
      meaning: (opts.meaning as string) ?? "./MEANING.yaml",
      base: opts.base as string | undefined,
      diff: opts.diff as string | undefined,
      staged: opts.staged as boolean | undefined,
      stdin: opts.stdin as boolean | undefined,
      model: (opts.model as string) ?? "claude-opus-4-7",
      format: ((opts.format as string) ?? "text") as "text" | "json" | "sarif",
      only: opts.only as string | undefined,
      failOn: ((opts.failOn as string) ?? "block") as "block" | "warn" | "observe",
      maxFiles: (opts.maxFiles as string) ?? "50",
      budgetUsd: (opts.budgetUsd as string) ?? "1.00",
      noColor: opts.color === false,
      verbose: opts.verbose as boolean | undefined,
      output: opts.output as string | undefined,
    });
  });

program.parse();
