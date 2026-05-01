import type { ReviewResult } from "../types.js";

export function renderJson(result: ReviewResult): string {
  return JSON.stringify(
    {
      version: "1",
      meaning_file: result.meaningFile,
      system: result.system,
      meaning_version: result.version,
      diff: result.diff,
      findings: result.findings.map((f) => ({
        constraint_id: f.constraintId,
        verdict: f.verdict,
        severity: f.severity,
        confidence: f.confidence,
        file: f.file,
        line: f.line,
        evidence_quote: f.evidenceQuote,
        rationale: f.rationale,
        suggestion: f.suggestion,
      })),
      insufficient_context: result.insufficientContext,
      stats: {
        constraints_total: result.stats.constraintsTotal,
        constraints_reviewed: result.stats.constraintsReviewed,
        calls: result.stats.calls,
        input_tokens: result.stats.inputTokens,
        output_tokens: result.stats.outputTokens,
        cost_usd: Number(result.stats.costUsd.toFixed(4)),
      },
    },
    null,
    2
  );
}
