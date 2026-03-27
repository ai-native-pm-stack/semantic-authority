import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline";
import chalk from "chalk";
import { parse as parseYaml } from "yaml";
import { generateContext, type MeaningDoc } from "./context.js";

interface InitOptions {
  dir: string;
  nonInteractive?: boolean;
}

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(chalk.cyan(`  ${question} `), (answer) => {
      resolve(answer.trim());
    });
  });
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export async function initCommand(options: InitOptions): Promise<void> {
  const dir = resolve(options.dir);
  const filePath = join(dir, "MEANING.yaml");

  if (existsSync(filePath)) {
    console.error(
      chalk.yellow(`\n  MEANING.yaml already exists at ${filePath}`)
    );
    console.error(
      chalk.dim(`  Use ${chalk.cyan("meaning validate")} to check it.\n`)
    );
    process.exit(1);
  }

  console.log(chalk.bold("\n  Semantic Authority — Create MEANING.yaml\n"));
  console.log(
    chalk.dim("  This will create a MEANING.yaml at your repo root.\n")
  );

  let systemName = "my-system";
  let primaryGoal =
    "Enable [who] to [do what] such that [observable outcome].";
  let owner = "platform-team";
  const nonGoals: string[] = [];
  const constraints: Array<{
    id: string;
    description: string;
    category: string;
    enforcement: string;
    owner: string;
    rationale: string;
  }> = [];

  if (!options.nonInteractive) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    systemName =
      (await ask(rl, "System name (kebab-case):")) || systemName;
    primaryGoal =
      (await ask(rl, "Primary goal (one sentence):")) || primaryGoal;
    owner = (await ask(rl, "Owner (role/team):")) || owner;

    console.log(
      chalk.dim(
        "\n  Non-goals prevent drift. Minimum 5. What does this system NOT do?\n"
      )
    );

    for (let i = 1; i <= 5; i++) {
      const ng = await ask(rl, `Non-goal ${i}:`);
      nonGoals.push(ng || `Does not [description ${i}]`);
    }

    // Ask for more non-goals
    let more = await ask(rl, "Add more non-goals? (y/n):");
    while (more.toLowerCase() === "y") {
      const ng = await ask(rl, `Non-goal ${nonGoals.length + 1}:`);
      if (ng) nonGoals.push(ng);
      more = await ask(rl, "Add more? (y/n):");
    }

    console.log(
      chalk.dim(
        "\n  Constraints are invariants. What must NEVER be violated?\n"
      )
    );

    const firstConstraint = await ask(
      rl,
      "First constraint (what must hold?):"
    );
    if (firstConstraint) {
      const enforcement = (await ask(
        rl,
        "Enforcement (block/warn/observe):"
      )) || "block";
      const constraintOwner = (await ask(rl, "Owner:")) || owner;
      const domain = (await ask(
        rl,
        "Domain (FIN/SEC/PERF/DATA/ARCH/OPS/UX/REL/COMPLIANCE):"
      )) || "ARCH";
      const shortname = firstConstraint
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .substring(0, 20);

      constraints.push({
        id: `C-${domain}-${shortname}-001`,
        description: firstConstraint,
        category: mapDomainToCategory(domain),
        enforcement: enforcement as string,
        owner: constraintOwner,
        rationale: "TODO: Add rationale",
      });
    }

    rl.close();
  } else {
    // Non-interactive defaults
    for (let i = 1; i <= 5; i++) {
      nonGoals.push(`Does not [description ${i}] — replace with actual non-goal`);
    }
    constraints.push({
      id: "C-ARCH-PLACEHOLDER-001",
      description: "Replace with actual constraint",
      category: "architectural",
      enforcement: "warn",
      owner: owner,
      rationale: "TODO: Add rationale",
    });
  }

  // Generate YAML content
  const yaml = generateYaml(
    systemName,
    primaryGoal,
    owner,
    nonGoals,
    constraints
  );

  // Write file
  writeFileSync(filePath, yaml, "utf-8");
  console.log(chalk.green(`\n  Created ${filePath}`));

  // Also generate context file
  const claudeDir = join(dir, ".claude");
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  const contextPath = join(claudeDir, "meaning-context.md");
  const doc = parseYaml(yaml) as MeaningDoc;
  const context = generateContext(doc);
  writeFileSync(contextPath, context, "utf-8");
  console.log(chalk.green(`  Generated ${contextPath}`));

  console.log(
    chalk.dim(
      `\n  Next steps:
  1. Edit MEANING.yaml — replace placeholders with real constraints
  2. Regenerate ${chalk.cyan(".claude/meaning-context.md")} after updates with ${chalk.cyan("meaning context")}
  3. Run ${chalk.cyan("meaning validate")} to check your artifact
  4. Add CI enforcement with the GitHub Action\n`
    )
  );
}

function mapDomainToCategory(domain: string): string {
  const map: Record<string, string> = {
    FIN: "business",
    SEC: "security",
    COMPLIANCE: "security",
    DATA: "data",
    UX: "operational",
    PERF: "operational",
    REL: "operational",
    ARCH: "architectural",
    OPS: "operational",
  };
  return map[domain.toUpperCase()] || "architectural";
}

function generateYaml(
  systemName: string,
  primaryGoal: string,
  owner: string,
  nonGoals: string[],
  constraints: Array<{
    id: string;
    description: string;
    category: string;
    enforcement: string;
    owner: string;
    rationale: string;
  }>
): string {
  const nonGoalLines = nonGoals
    .map((ng) => `    - "${ng}"`)
    .join("\n");

  const constraintLines = constraints
    .map(
      (c) => `  - id: ${c.id}
    description: "${c.description}"
    category: ${c.category}
    enforcement: ${c.enforcement}
    owner: "${c.owner}"
    rationale: "${c.rationale}"
    source: declared
    confidence: high`
    )
    .join("\n\n");

  return `# Semantic Authority — System Meaning
# Generated by: meaning init
# Docs: https://github.com/ai-native-pm-stack/semantic-authority

system: ${systemName}
version: 1.0.0
status: draft
owner: ${owner}
last_reviewed: ${today()}

goal:
  primary: >
    ${primaryGoal}
  success_criteria:
    - "TODO: Define observable success criterion"
  non_goals:
${nonGoalLines}

constraints:
${constraintLines}

trade_offs:
  chosen:
    approach: "TODO: What approach was selected"
    rationale: "TODO: Why this approach"
  rejected:
    - alternative: "TODO: What was considered"
      reason: "TODO: Why it was rejected"
      revisit_condition: "TODO: When to reconsider"

drift_policy:
  review_cadence: monthly
  enforcement_rules:
    block: "Violation must not merge without remediation or approved drift record"
    warn: "Acknowledgement required with owner and revisit date"
    observe: "Logged for trend analysis; reviewed periodically"

provenance:
  source_summary: "Generated via meaning init"
  assumptions:
    - "TODO: List assumptions"
  clarifications_needed:
    - "TODO: List open questions"
`;
}
