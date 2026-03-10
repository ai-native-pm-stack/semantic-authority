import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";

const Ajv = AjvModule.default || AjvModule;
const addFormats = addFormatsModule.default || addFormatsModule;
import { parse as parseYaml } from "yaml";
import chalk from "chalk";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ValidateOptions {
  file: string;
  strict?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const filePath = resolve(options.file);

  // Check file exists
  if (!existsSync(filePath)) {
    console.error(
      chalk.red(`\n  MEANING.yaml not found at ${filePath}`)
    );
    console.error(
      chalk.dim(`  Run ${chalk.cyan("meaning init")} to create one.\n`)
    );
    process.exit(1);
  }

  // Parse YAML
  let doc: unknown;
  try {
    const content = readFileSync(filePath, "utf-8");
    doc = parseYaml(content);
  } catch (e) {
    console.error(chalk.red(`\n  Failed to parse YAML: ${(e as Error).message}\n`));
    process.exit(1);
  }

  // Load schema
  const schemaPath = join(__dirname, "..", "schema", "meaning.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

  // Validate against JSON Schema
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const schemaValid = validate(doc);

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!schemaValid && validate.errors) {
    result.valid = false;
    for (const err of validate.errors) {
      const path = err.instancePath || "(root)";
      const msg = err.message || "unknown error";
      result.errors.push(`${path}: ${msg}`);
    }
  }

  // Additional semantic checks beyond JSON Schema
  if (doc && typeof doc === "object") {
    const d = doc as Record<string, unknown>;

    // Check constraint ID uniqueness
    const constraints = d.constraints as Array<Record<string, unknown>> | undefined;
    if (constraints) {
      const ids = constraints.map((c) => c.id as string);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (duplicates.length > 0) {
        result.valid = false;
        result.errors.push(
          `Duplicate constraint IDs: ${[...new Set(duplicates)].join(", ")}`
        );
      }

      // Check: low-confidence constraints should not be block-level
      for (const c of constraints) {
        if (c.confidence === "low" && c.enforcement === "block") {
          result.warnings.push(
            `${c.id}: Low-confidence constraint is block-level. Consider warn until confidence increases.`
          );
        }
      }

      // Check: assumed constraints with block enforcement
      for (const c of constraints) {
        if (c.source === "assumed" && c.enforcement === "block") {
          result.warnings.push(
            `${c.id}: Assumed (not declared) constraint is block-level. Verify with stakeholder.`
          );
        }
      }
    }

    // Check: last_reviewed staleness (> 90 days)
    const lastReviewed = d.last_reviewed as string | undefined;
    if (lastReviewed) {
      const reviewDate = new Date(lastReviewed);
      const daysSinceReview = Math.floor(
        (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReview > 90) {
        result.warnings.push(
          `last_reviewed is ${daysSinceReview} days ago. Consider a meaning review.`
        );
      }
    }

    // Check: status is deprecated but constraints still block
    if (d.status === "deprecated" && constraints) {
      const blockConstraints = constraints.filter(
        (c) => c.enforcement === "block"
      );
      if (blockConstraints.length > 0) {
        result.warnings.push(
          `Status is 'deprecated' but ${blockConstraints.length} block-level constraints remain. Consider downgrading.`
        );
      }
    }
  }

  // If strict mode, treat warnings as errors
  if (options.strict && result.warnings.length > 0) {
    result.valid = false;
    result.errors.push(...result.warnings.map((w) => `(strict) ${w}`));
    result.warnings = [];
  }

  // Output
  console.log("");

  if (result.errors.length > 0) {
    console.log(chalk.red.bold("  MEANING.yaml validation failed:\n"));
    for (const err of result.errors) {
      console.log(chalk.red(`  ${chalk.dim("✗")} ${err}`));
    }
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow.bold("\n  Warnings:\n"));
    for (const warn of result.warnings) {
      console.log(chalk.yellow(`  ${chalk.dim("⚠")} ${warn}`));
    }
  }

  if (result.valid) {
    // Summary stats
    const d = doc as Record<string, unknown>;
    const constraints = (d.constraints as Array<Record<string, unknown>>) || [];
    const goal = d.goal as Record<string, unknown>;
    const nonGoals = (goal?.non_goals as string[]) || [];
    const blockCount = constraints.filter(
      (c) => c.enforcement === "block"
    ).length;
    const warnCount = constraints.filter(
      (c) => c.enforcement === "warn"
    ).length;
    const observeCount = constraints.filter(
      (c) => c.enforcement === "observe"
    ).length;

    console.log(chalk.green.bold("  MEANING.yaml is valid.\n"));
    console.log(
      chalk.dim(
        `  System:      ${d.system} v${d.version} (${d.status})`
      )
    );
    console.log(chalk.dim(`  Owner:       ${d.owner}`));
    console.log(chalk.dim(`  Non-goals:   ${nonGoals.length}`));
    console.log(
      chalk.dim(
        `  Constraints: ${constraints.length} (${chalk.red(`${blockCount} block`)} / ${chalk.yellow(`${warnCount} warn`)} / ${chalk.blue(`${observeCount} observe`)})`
      )
    );
    console.log("");
  }

  process.exit(result.valid ? 0 : 1);
}
