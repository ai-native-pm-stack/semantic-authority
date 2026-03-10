#!/usr/bin/env node

import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { initCommand } from "./commands/init.js";
import { contextCommand } from "./commands/context.js";

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

program.parse();
