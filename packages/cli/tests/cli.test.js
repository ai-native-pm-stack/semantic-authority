import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const testsDir = dirname(thisFile);
const packageRoot = resolve(testsDir, "..");
const cliPath = resolve(packageRoot, "dist", "index.js");
const exampleMeaning = resolve(
  packageRoot,
  "..",
  "..",
  "examples",
  "invoice-processor",
  "MEANING.yaml"
);

function runMeaning(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    cwd: packageRoot,
  });
}

function makeTempDir(prefix) {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

function writeMeaningFile(dir, contents) {
  const file = resolve(dir, "MEANING.yaml");
  writeFileSync(file, contents, "utf8");
  return file;
}

test("validate succeeds against the worked example", () => {
  const result = runMeaning(["validate", "--file", exampleMeaning]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /MEANING\.yaml is valid\./);
  assert.match(result.stdout, /invoice-processor v1\.0\.0/);
});

test("validate fails when constraint IDs are duplicated", () => {
  const tempDir = makeTempDir("meaning-dup-");
  const meaningFile = writeMeaningFile(
    tempDir,
    `system: duplicate-check
version: 1.0.0
status: active
owner: platform-team
last_reviewed: 2026-03-27

goal:
  primary: >
    Enable finance teams to review duplicate constraints before code merges.
  success_criteria:
    - "Duplicate constraints are rejected"
  non_goals:
    - "Does not execute payments"
    - "Does not send notifications"
    - "Does not manage user onboarding"
    - "Does not support multi-currency"
    - "Does not replace human approval"

constraints:
  - id: C-ARCH-DUPLICATE-ID-001
    description: "Constraint IDs must remain unique across the file."
    category: architectural
    enforcement: block
    owner: platform-team
    rationale: "IDs are referenced by tooling and reviews."
    source: declared
    confidence: high

  - id: C-ARCH-DUPLICATE-ID-001
    description: "A second constraint reuses the same identifier."
    category: architectural
    enforcement: warn
    owner: platform-team
    rationale: "This entry exists only for test coverage."
    source: declared
    confidence: medium
`
  );

  const result = runMeaning(["validate", "--file", meaningFile]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Duplicate constraint IDs: C-ARCH-DUPLICATE-ID-001/);
});

test("strict validation fails when warnings are present", () => {
  const tempDir = makeTempDir("meaning-strict-");
  const meaningFile = writeMeaningFile(
    tempDir,
    `system: strict-check
version: 1.0.0
status: active
owner: governance-team
last_reviewed: 2026-03-27

goal:
  primary: >
    Enable teams to prove strict validation catches risky meaning artifacts before release.
  success_criteria:
    - "Warnings become errors in strict mode"
  non_goals:
    - "Does not create runtime policy engines"
    - "Does not manage deployment rollbacks"
    - "Does not replace legal review"
    - "Does not define user interfaces"
    - "Does not monitor production traffic"

constraints:
  - id: C-SEC-BLOCK-WITH-LOW-CONFIDENCE-001
    description: "Sensitive account identifiers must never be exposed in logs."
    category: security
    enforcement: block
    owner: security
    rationale: "Exposure creates fraud and compliance risk."
    source: declared
    confidence: low
`
  );

  const result = runMeaning(["validate", "--file", meaningFile, "--strict"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /\(strict\) C-SEC-BLOCK-WITH-LOW-CONFIDENCE-001/);
});

test("context writes a usable agent context file", () => {
  const tempDir = makeTempDir("meaning-context-");
  const outputFile = resolve(tempDir, ".claude", "meaning-context.md");

  const result = runMeaning([
    "context",
    "--file",
    exampleMeaning,
    "--output",
    outputFile,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(outputFile), true);

  const contents = readFileSync(outputFile, "utf8");
  assert.match(contents, /## System Meaning \(auto-generated from MEANING\.yaml/);
  assert.match(contents, /### BLOCK-Level Constraints/);
  assert.match(contents, /C-FIN-NO-DOUBLE-PAY-001/);
});

test("init --non-interactive creates both MEANING.yaml and agent context", () => {
  const tempDir = makeTempDir("meaning-init-");
  const result = runMeaning(["init", "--non-interactive", "--dir", tempDir]);

  assert.equal(result.status, 0, result.stderr);

  const meaningFile = resolve(tempDir, "MEANING.yaml");
  const contextFile = resolve(tempDir, ".claude", "meaning-context.md");

  assert.equal(existsSync(meaningFile), true);
  assert.equal(existsSync(contextFile), true);

  const validateResult = runMeaning(["validate", "--file", meaningFile]);
  assert.equal(validateResult.status, 0, validateResult.stderr);
});
