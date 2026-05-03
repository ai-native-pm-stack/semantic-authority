import type { Constraint, ReviewResult } from "../types.js";

export function renderSarif(result: ReviewResult, constraints: Constraint[]): string {
  const rules = constraints.map((c) => ({
    id: c.id,
    name: c.id,
    shortDescription: { text: truncate(c.description, 120) },
    fullDescription: { text: c.description },
    helpUri: undefined,
    help: { text: `Rationale: ${c.rationale}` },
    defaultConfiguration: {
      level: severityToLevel(c.enforcement),
    },
    properties: {
      category: c.category,
      enforcement: c.enforcement,
      owner: c.owner,
    },
  }));

  const results = result.findings.map((f) => ({
    ruleId: f.constraintId,
    level: severityToLevel(f.severity),
    message: {
      text:
        f.rationale + (f.suggestion ? `\n\nSuggestion: ${f.suggestion}` : ""),
    },
    locations: f.file
      ? [
          {
            physicalLocation: {
              artifactLocation: { uri: f.file },
              region: f.line ? { startLine: f.line } : undefined,
            },
          },
        ]
      : [],
    properties: {
      verdict: f.verdict,
      confidence: f.confidence,
      evidence_quote: f.evidenceQuote,
    },
  }));

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "meaning-review",
            informationUri: "https://github.com/ai-native-pm-stack/semantic-authority",
            version: "0.2.0-alpha",
            rules,
          },
        },
        results,
        invocations: [
          {
            executionSuccessful: true,
            properties: {
              meaning_file: result.meaningFile,
              system: result.system,
              cost_usd: result.stats.costUsd,
              cache_hit: result.judge?.cacheHit ?? false,
              judge_provider: result.judge?.provider,
              judge_model: result.judge?.model,
            },
          },
        ],
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

function severityToLevel(s: "block" | "warn" | "observe"): "error" | "warning" | "note" {
  if (s === "block") return "error";
  if (s === "warn") return "warning";
  return "note";
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
