import type { ReviewResult } from "../types.js";

export function renderJson(result: ReviewResult): string {
  return JSON.stringify(
    {
      version: "1",
      meaning_file: result.meaningFile,
      system: result.system,
      meaning_version: result.version,
      judge: result.judge
        ? {
            provider: result.judge.provider,
            model: result.judge.model,
            cache_hit: result.judge.cacheHit,
            cache_key: result.judge.cacheKey,
            cached_at: result.judge.cachedAt,
          }
        : undefined,
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
      insufficient_context: result.insufficientContext.map((item) => ({
        constraint_id: item.constraintId,
        confidence: item.confidence,
        rationale: item.rationale,
      })),
      stats: {
        constraints_total: result.stats.constraintsTotal,
        constraints_reviewed: result.stats.constraintsReviewed,
        calls: result.stats.calls,
        input_tokens: result.stats.inputTokens,
        output_tokens: result.stats.outputTokens,
        cost_usd: Number(result.stats.costUsd.toFixed(4)),
        cache_saved_usd:
          result.stats.cacheSavedUsd !== undefined
            ? Number(result.stats.cacheSavedUsd.toFixed(4))
            : undefined,
      },
    },
    null,
    2
  );
}
