import test from "node:test";
import assert from "node:assert/strict";
import { parseUnifiedDiff, lineTouchesDiffHunk } from "../dist/review/diff.js";
import { prefilter, globMatch } from "../dist/review/prefilter.js";
import { aggregate, quoteAppearsInDiff, exitCodeFor } from "../dist/review/aggregate.js";
import { parseJudgeResponse, buildConstraintBlock } from "../dist/review/judge.js";
import { estimateTokens, checkBudget, estimateCostUsd } from "../dist/review/budget.js";
import { renderText } from "../dist/review/render/text.js";
import { renderJson } from "../dist/review/render/json.js";
import { renderSarif } from "../dist/review/render/sarif.js";

const SAMPLE_DIFF = `diff --git a/src/payments/submit.ts b/src/payments/submit.ts
index abc..def 100644
--- a/src/payments/submit.ts
+++ b/src/payments/submit.ts
@@ -38,6 +38,9 @@ export async function submitPayment(invoice) {
   const result = await chargeProvider(invoice);
   if (result.error) {
+    // retry once on transient failures
+    return await chargeProvider(invoice);
+  }
   return result;
 }
`;

const SAMPLE_CONSTRAINTS = [
  {
    id: "C-FIN-NO-DOUBLE-PAY-001",
    description: "An invoice must never be paid twice for the same vendor and invoice number",
    category: "business",
    enforcement: "block",
    owner: "finance-engineering",
    rationale: "Duplicate payments cause direct financial loss",
    source: "declared",
    confidence: "high",
    path_globs: ["src/payments/**"],
  },
  {
    id: "C-PERF-SEARCH-P95-004",
    description: "Invoice search P95 latency must remain under 500ms",
    category: "operational",
    enforcement: "warn",
    owner: "finance-engineering",
    rationale: "Slow search blocks reconciliation",
    source: "declared",
    confidence: "medium",
    path_globs: ["src/search/**"],
  },
];

test("parseUnifiedDiff extracts file path, status, and hunks", () => {
  const files = parseUnifiedDiff(SAMPLE_DIFF);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, "src/payments/submit.ts");
  assert.equal(files[0].status, "modified");
  assert.equal(files[0].hunks.length, 1);
  assert.equal(files[0].hunks[0].newStart, 38);
});

test("parseUnifiedDiff handles new files", () => {
  const diff = `diff --git a/x.ts b/x.ts
new file mode 100644
index 0000000..abc
--- /dev/null
+++ b/x.ts
@@ -0,0 +1,2 @@
+export const a = 1;
+export const b = 2;
`;
  const files = parseUnifiedDiff(diff);
  assert.equal(files[0].status, "added");
  assert.equal(files[0].path, "x.ts");
});

test("globMatch handles ** and *", () => {
  assert.ok(globMatch("src/payments/**", "src/payments/submit.ts"));
  assert.ok(globMatch("src/payments/**", "src/payments/lib/util.ts"));
  assert.ok(!globMatch("src/payments/**", "src/search/query.ts"));
  assert.ok(globMatch("**/*.ts", "src/payments/submit.ts"));
  assert.ok(!globMatch("**/*.ts", "src/payments/submit.js"));
});

test("prefilter always keeps block-level constraints", () => {
  const diff = {
    base: "main",
    head: "HEAD",
    files: [{ path: "docs/readme.md", oldPath: undefined, status: "modified", hunks: [], rawPatch: "" }],
    totalLines: 0,
  };
  const decisions = prefilter(SAMPLE_CONSTRAINTS, diff);
  const block = decisions.find((d) => d.constraint.id === "C-FIN-NO-DOUBLE-PAY-001");
  assert.ok(block.matched);
});

test("prefilter skips warn constraints whose path_globs miss and have no keyword overlap", () => {
  const constraints = [
    {
      id: "C-OPS-RUNBOOK-009",
      description: "On-call runbooks must remain documented in the wiki",
      category: "operational",
      enforcement: "warn",
      owner: "sre",
      rationale: "Operational continuity",
      source: "declared",
      confidence: "medium",
      path_globs: ["docs/runbooks/**"],
    },
  ];
  const diff = parseUnifiedDiff(SAMPLE_DIFF);
  const decisions = prefilter(constraints, { base: "main", head: "HEAD", files: diff, totalLines: 1 });
  assert.ok(!decisions[0].matched, "should skip when no path or keyword match");
});

test("prefilter matches by path_globs for warn-level constraints", () => {
  const constraints = [
    {
      id: "C-PERF-SEARCH-P95-004",
      description: "Invoice search P95 latency must remain under 500ms",
      category: "operational",
      enforcement: "warn",
      owner: "finance-engineering",
      rationale: "Slow search blocks reconciliation",
      source: "declared",
      confidence: "medium",
      path_globs: ["src/search/**"],
    },
  ];
  const diff = parseUnifiedDiff(`diff --git a/src/search/query.ts b/src/search/query.ts
index abc..def 100644
--- a/src/search/query.ts
+++ b/src/search/query.ts
@@ -1,3 +1,3 @@
-const idx = "vendor_id_created_at";
+const idx = null;
 export const q = idx;
`);
  const decisions = prefilter(constraints, { base: "main", head: "HEAD", files: diff, totalLines: 2 });
  assert.ok(decisions[0].matched, "should match via path_globs");
});

test("quoteAppearsInDiff matches normalized substrings", () => {
  const diff = SAMPLE_DIFF;
  assert.ok(quoteAppearsInDiff("return await chargeProvider(invoice);", diff));
  assert.ok(!quoteAppearsInDiff("totally fabricated quote that does not exist", diff));
});

test("aggregate drops findings without evidence in diff", () => {
  const diff = { base: "main", head: "HEAD", files: parseUnifiedDiff(SAMPLE_DIFF), totalLines: 3 };
  const result = aggregate({
    rawFindings: [
      {
        constraint_id: "C-FIN-NO-DOUBLE-PAY-001",
        verdict: "at_risk",
        confidence: "high",
        file: "src/payments/submit.ts",
        line: 41,
        evidence_quote: "return await chargeProvider(invoice);",
        rationale: "Retry bypasses idempotency check.",
        suggestion: "Add idempotency assertion.",
      },
      {
        constraint_id: "C-FIN-NO-DOUBLE-PAY-001",
        verdict: "at_risk",
        confidence: "high",
        evidence_quote: "fabricated text not in diff",
        rationale: "hallucinated",
      },
    ],
    constraints: SAMPLE_CONSTRAINTS,
    diff,
  });
  assert.equal(result.findings.length, 1);
  assert.equal(result.dropped.length, 1);
  assert.equal(result.findings[0].severity, "block");
});

test("aggregate drops findings whose location is not in the diff hunk", () => {
  const diff = { base: "main", head: "HEAD", files: parseUnifiedDiff(SAMPLE_DIFF), totalLines: 3 };
  const result = aggregate({
    rawFindings: [
      {
        constraint_id: "C-FIN-NO-DOUBLE-PAY-001",
        verdict: "at_risk",
        confidence: "high",
        file: "src/payments/submit.ts",
        line: 99,
        evidence_quote: "return await chargeProvider(invoice);",
        rationale: "Retry bypasses idempotency check.",
      },
    ],
    constraints: SAMPLE_CONSTRAINTS,
    diff,
  });
  assert.equal(result.findings.length, 0);
  assert.match(result.dropped[0].reason, /line not present in diff hunk/);
});

test("aggregate canonicalizes renamed file locations to the new path", () => {
  const diff = {
    base: "main",
    head: "HEAD",
    files: parseUnifiedDiff(`diff --git a/src/old.ts b/src/new.ts
similarity index 100%
rename from src/old.ts
rename to src/new.ts
--- a/src/old.ts
+++ b/src/new.ts
@@ -10,1 +10,2 @@
 export const x = 1;
+export const y = x + 1;
`),
    totalLines: 1,
  };
  const constraints = [
    {
      ...SAMPLE_CONSTRAINTS[0],
      path_globs: ["src/**"],
    },
  ];
  const result = aggregate({
    rawFindings: [
      {
        constraint_id: "C-FIN-NO-DOUBLE-PAY-001",
        verdict: "at_risk",
        confidence: "high",
        file: "src/old.ts",
        line: 10,
        evidence_quote: "export const x = 1;",
        rationale: "Rename touches the guarded path.",
      },
    ],
    constraints,
    diff,
  });
  assert.equal(result.findings[0].file, "src/new.ts");
});

test("aggregate dedupes by constraint+file+line", () => {
  const diff = { base: "main", head: "HEAD", files: parseUnifiedDiff(SAMPLE_DIFF), totalLines: 3 };
  const dup = {
    constraint_id: "C-FIN-NO-DOUBLE-PAY-001",
    verdict: "at_risk",
    confidence: "high",
    file: "src/payments/submit.ts",
    line: 41,
    evidence_quote: "return await chargeProvider(invoice);",
    rationale: "x",
  };
  const result = aggregate({
    rawFindings: [dup, dup],
    constraints: SAMPLE_CONSTRAINTS,
    diff,
  });
  assert.equal(result.findings.length, 1);
});

test("aggregate captures insufficient_context", () => {
  const diff = { base: "main", head: "HEAD", files: parseUnifiedDiff(SAMPLE_DIFF), totalLines: 3 };
  const result = aggregate({
    rawFindings: [
      {
        constraint_id: "C-PERF-SEARCH-P95-004",
        verdict: "insufficient_context",
        confidence: "low",
        rationale: "Cannot evaluate without runtime data",
      },
    ],
    constraints: SAMPLE_CONSTRAINTS,
    diff,
  });
  assert.deepEqual(result.insufficientContext, [
    {
      constraintId: "C-PERF-SEARCH-P95-004",
      confidence: "low",
      rationale: "Cannot evaluate without runtime data",
    },
  ]);
  assert.equal(result.findings.length, 0);
});

test("lineTouchesDiffHunk accepts lines inside the changed hunk range", () => {
  const [file] = parseUnifiedDiff(SAMPLE_DIFF);
  assert.equal(lineTouchesDiffHunk(file, 38), true);
  assert.equal(lineTouchesDiffHunk(file, 41), true);
  assert.equal(lineTouchesDiffHunk(file, 99), false);
});

test("exitCodeFor returns 1 only at or above threshold", () => {
  const findings = [{ severity: "warn" }];
  assert.equal(exitCodeFor(findings, "block"), 0);
  assert.equal(exitCodeFor(findings, "warn"), 1);
  assert.equal(exitCodeFor([], "block"), 0);
  assert.equal(exitCodeFor([{ severity: "block" }], "block"), 1);
});

test("parseJudgeResponse extracts findings from tool_use", () => {
  const fake = {
    content: [
      {
        type: "tool_use",
        name: "report_findings",
        input: {
          findings: [
            {
              constraint_id: "C-FIN-NO-DOUBLE-PAY-001",
              verdict: "at_risk",
              confidence: "high",
              rationale: "test",
            },
            { constraint_id: "bogus", verdict: "invalid" }, // should be filtered
          ],
        },
      },
    ],
    usage: { input_tokens: 100, output_tokens: 20 },
  };
  const r = parseJudgeResponse(fake);
  assert.equal(r.findings.length, 1);
  assert.equal(r.usage.inputTokens, 100);
});

test("buildConstraintBlock includes id, enforcement, description", () => {
  const text = buildConstraintBlock(SAMPLE_CONSTRAINTS);
  assert.match(text, /C-FIN-NO-DOUBLE-PAY-001/);
  assert.match(text, /enforcement: block/);
});

test("estimateTokens scales with length", () => {
  assert.ok(estimateTokens("a".repeat(400)) >= 100);
});

test("checkBudget reports breach", () => {
  const diff = { base: "m", head: "H", files: parseUnifiedDiff(SAMPLE_DIFF), totalLines: 3 };
  const b = checkBudget("claude-opus-4-7", SAMPLE_CONSTRAINTS, diff, 0.000001);
  assert.equal(b.withinBudget, false);
});

test("estimateCostUsd computes deterministically", () => {
  const c = estimateCostUsd("claude-opus-4-7", 1_000_000, 0);
  assert.equal(c, 15);
});

test("renderText shows constraint id and severity", () => {
  const out = renderText(
    {
      meaningFile: "MEANING.yaml",
      system: "demo",
      version: "1.0.0",
      diff: { base: "main", head: "HEAD", files: 1, lines: 3 },
      findings: [
        {
          constraintId: "C-FIN-NO-DOUBLE-PAY-001",
          severity: "block",
          verdict: "at_risk",
          confidence: "high",
          file: "src/payments/submit.ts",
          line: 41,
          evidenceQuote: "x",
          rationale: "Retry path",
          suggestion: "add idempotency",
        },
      ],
      stats: { constraintsTotal: 2, constraintsReviewed: 2, calls: 1, inputTokens: 100, outputTokens: 20, costUsd: 0.01 },
      insufficientContext: [],
    },
    { noColor: true }
  );
  assert.match(out, /C-FIN-NO-DOUBLE-PAY-001/);
  assert.match(out, /AT RISK/);
  assert.match(out, /Summary: 1 block/);
});

test("renderText includes insufficient_context rationale", () => {
  const out = renderText(
    {
      meaningFile: "MEANING.yaml",
      system: "demo",
      version: "1.0.0",
      diff: { base: "main", head: "HEAD", files: 1, lines: 3 },
      findings: [],
      stats: { constraintsTotal: 1, constraintsReviewed: 1, calls: 1, inputTokens: 10, outputTokens: 2, costUsd: 0.001 },
      insufficientContext: [
        {
          constraintId: "C-OPS-RUNBOOK-009",
          confidence: "low",
          rationale: "Description is too vague to evaluate against this diff.",
        },
      ],
    },
    { noColor: true }
  );
  assert.match(out, /C-OPS-RUNBOOK-009/);
  assert.match(out, /too vague to evaluate/);
});

test("renderJson emits stable v1 shape", () => {
  const out = renderJson({
    meaningFile: "M",
    system: "s",
    version: "1.0.0",
    diff: { base: "main", head: "HEAD", files: 0, lines: 0 },
    findings: [],
    stats: { constraintsTotal: 0, constraintsReviewed: 0, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
    insufficientContext: [
      {
        constraintId: "C-OPS-RUNBOOK-009",
        confidence: "low",
        rationale: "Description is too vague to evaluate against this diff.",
      },
    ],
  });
  const parsed = JSON.parse(out);
  assert.equal(parsed.version, "1");
  assert.ok(Array.isArray(parsed.findings));
  assert.equal(parsed.insufficient_context[0].constraint_id, "C-OPS-RUNBOOK-009");
});

test("renderSarif produces valid 2.1.0 envelope with rules", () => {
  const out = renderSarif(
    {
      meaningFile: "M",
      system: "s",
      version: "1.0.0",
      diff: { base: "main", head: "HEAD", files: 1, lines: 3 },
      findings: [
        {
          constraintId: "C-FIN-NO-DOUBLE-PAY-001",
          severity: "block",
          verdict: "at_risk",
          confidence: "high",
          file: "src/payments/submit.ts",
          line: 41,
          rationale: "r",
        },
      ],
      stats: { constraintsTotal: 1, constraintsReviewed: 1, calls: 1, inputTokens: 1, outputTokens: 1, costUsd: 0.01 },
      insufficientContext: [],
    },
    SAMPLE_CONSTRAINTS
  );
  const parsed = JSON.parse(out);
  assert.equal(parsed.version, "2.1.0");
  assert.equal(parsed.runs[0].results[0].ruleId, "C-FIN-NO-DOUBLE-PAY-001");
  assert.equal(parsed.runs[0].results[0].level, "error");
  assert.ok(parsed.runs[0].tool.driver.rules.length >= 1);
});
