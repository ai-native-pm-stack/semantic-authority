import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import chalk from "chalk";

interface ContextOptions {
  file: string;
  output: string;
}

interface Constraint {
  id: string;
  description: string;
  category: string;
  enforcement: string;
  owner: string;
  rationale: string;
  source: string;
  confidence: string;
}

interface MeaningDoc {
  system: string;
  version: string;
  status: string;
  owner: string;
  last_reviewed: string;
  goal: {
    primary: string;
    success_criteria?: string[];
    non_goals: string[];
  };
  constraints: Constraint[];
  trade_offs?: {
    chosen?: { approach: string; rationale: string };
    rejected?: Array<{
      alternative: string;
      reason: string;
      revisit_condition?: string;
    }>;
    known_risks?: Array<{ risk: string; mitigation?: string }>;
  };
  interfaces?: {
    consumes?: string[];
    provides?: string[];
  };
}

export async function contextCommand(options: ContextOptions): Promise<void> {
  const filePath = resolve(options.file);
  const outputPath = resolve(options.output);

  // Check file exists
  if (!existsSync(filePath)) {
    console.error(chalk.red(`\n  MEANING.yaml not found at ${filePath}`));
    console.error(
      chalk.dim(`  Run ${chalk.cyan("meaning init")} to create one.\n`)
    );
    process.exit(1);
  }

  // Parse YAML
  let doc: MeaningDoc;
  try {
    const content = readFileSync(filePath, "utf-8");
    doc = parseYaml(content) as MeaningDoc;
  } catch (e) {
    console.error(
      chalk.red(`\n  Failed to parse YAML: ${(e as Error).message}\n`)
    );
    process.exit(1);
  }

  // Generate context markdown
  const context = generateContext(doc);

  // Ensure output directory exists
  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Write context file
  writeFileSync(outputPath, context, "utf-8");

  const blockCount = doc.constraints.filter(
    (c) => c.enforcement === "block"
  ).length;
  const warnCount = doc.constraints.filter(
    (c) => c.enforcement === "warn"
  ).length;

  console.log(chalk.green(`\n  Generated agent context at ${outputPath}`));
  console.log(
    chalk.dim(
      `  ${doc.constraints.length} constraints (${blockCount} block, ${warnCount} warn)`
    )
  );
  console.log(chalk.dim(`  ${doc.goal.non_goals.length} non-goals`));
  console.log(
    chalk.dim(
      `\n  Add to your CLAUDE.md or agent configuration to enable meaning-aware development.\n`
    )
  );
}

function generateContext(doc: MeaningDoc): string {
  const lines: string[] = [];

  // Header
  lines.push(
    `## System Meaning (auto-generated from MEANING.yaml — do not edit manually)`
  );
  lines.push(
    `## Source: ${doc.system} v${doc.version} | Status: ${doc.status} | Last reviewed: ${doc.last_reviewed}`
  );
  lines.push("");

  // Purpose
  lines.push("### This System's Purpose");
  lines.push("");
  lines.push(doc.goal.primary.trim());
  lines.push("");

  // Success criteria
  if (doc.goal.success_criteria && doc.goal.success_criteria.length > 0) {
    lines.push("**Success looks like:**");
    for (const sc of doc.goal.success_criteria) {
      lines.push(`- ${sc}`);
    }
    lines.push("");
  }

  // Block-level constraints
  const blockConstraints = doc.constraints.filter(
    (c) => c.enforcement === "block"
  );
  if (blockConstraints.length > 0) {
    lines.push("### BLOCK-Level Constraints (must NEVER violate)");
    lines.push("");
    lines.push(
      "These are non-negotiable. If your code change violates any of these, stop and surface the conflict to a human."
    );
    lines.push("");
    for (const c of blockConstraints) {
      lines.push(`- **${c.id}**: ${c.description}`);
      lines.push(`  - Owner: ${c.owner} | Rationale: ${c.rationale}`);
    }
    lines.push("");
  }

  // Warn-level constraints
  const warnConstraints = doc.constraints.filter(
    (c) => c.enforcement === "warn"
  );
  if (warnConstraints.length > 0) {
    lines.push(
      "### WARN-Level Constraints (flag if affected, do not silently violate)"
    );
    lines.push("");
    for (const c of warnConstraints) {
      lines.push(`- **${c.id}**: ${c.description}`);
    }
    lines.push("");
  }

  // Observe-level constraints
  const observeConstraints = doc.constraints.filter(
    (c) => c.enforcement === "observe"
  );
  if (observeConstraints.length > 0) {
    lines.push("### OBSERVE-Level Constraints (note if relevant)");
    lines.push("");
    for (const c of observeConstraints) {
      lines.push(`- **${c.id}**: ${c.description}`);
    }
    lines.push("");
  }

  // Non-goals
  lines.push("### This System Does NOT");
  lines.push("");
  lines.push(
    "Do not implement, suggest, or expand scope into any of the following areas:"
  );
  lines.push("");
  for (const ng of doc.goal.non_goals) {
    lines.push(`- ${ng}`);
  }
  lines.push("");

  // Trade-offs
  if (doc.trade_offs) {
    lines.push("### Trade-Offs You Should Know");
    lines.push("");

    if (doc.trade_offs.chosen) {
      lines.push(
        `**Chosen:** ${doc.trade_offs.chosen.approach} — ${doc.trade_offs.chosen.rationale}`
      );
    }

    if (doc.trade_offs.rejected && doc.trade_offs.rejected.length > 0) {
      lines.push("");
      lines.push("**Rejected alternatives:**");
      for (const r of doc.trade_offs.rejected) {
        let line = `- ${r.alternative}: ${r.reason}`;
        if (r.revisit_condition) {
          line += ` (revisit when: ${r.revisit_condition})`;
        }
        lines.push(line);
      }
    }

    if (doc.trade_offs.known_risks && doc.trade_offs.known_risks.length > 0) {
      lines.push("");
      lines.push("**Known risks:**");
      for (const r of doc.trade_offs.known_risks) {
        let line = `- ${r.risk}`;
        if (r.mitigation) {
          line += ` — Mitigation: ${r.mitigation}`;
        }
        lines.push(line);
      }
    }
    lines.push("");
  }

  // Agent instructions
  lines.push("### When You Write Code");
  lines.push("");
  lines.push("- **Cite constraint IDs** in PR descriptions and code comments");
  lines.push("- **Do not widen scope** beyond the declared non-goals above");
  lines.push(
    "- **If you cannot cite a relevant constraint**, the MEANING.yaml may be incomplete — flag this for human review"
  );
  lines.push(
    "- **If a change requires violating a block-level constraint**, stop and ask the human for guidance"
  );
  lines.push(
    "- **If a change degrades a warn-level constraint**, note the degradation with a rationale and revisit date"
  );
  lines.push("");

  return lines.join("\n");
}
