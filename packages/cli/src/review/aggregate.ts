import type {
  Constraint,
  Diff,
  Finding,
  JudgeFindingRaw,
} from "./types.js";

export interface AggregateInput {
  rawFindings: JudgeFindingRaw[];
  constraints: Constraint[];
  diff: Diff;
}

export interface AggregateResult {
  findings: Finding[];
  insufficientContext: string[];
  dropped: Array<{ raw: JudgeFindingRaw; reason: string }>;
}

export function aggregate(input: AggregateInput): AggregateResult {
  const byId = new Map(input.constraints.map((c) => [c.id, c]));
  const findings: Finding[] = [];
  const insufficient: string[] = [];
  const dropped: Array<{ raw: JudgeFindingRaw; reason: string }> = [];
  const seen = new Set<string>();

  const diffText = input.diff.files.map((f) => f.rawPatch).join("\n");

  for (const raw of input.rawFindings) {
    const constraint = byId.get(raw.constraint_id);
    if (!constraint) {
      dropped.push({ raw, reason: "unknown constraint id" });
      continue;
    }

    if (raw.verdict === "not_at_risk") continue;

    if (raw.verdict === "insufficient_context") {
      if (!insufficient.includes(raw.constraint_id)) {
        insufficient.push(raw.constraint_id);
      }
      continue;
    }

    // at_risk — require evidence quote that appears in the diff
    if (!raw.evidence_quote || !quoteAppearsInDiff(raw.evidence_quote, diffText)) {
      dropped.push({ raw, reason: "evidence_quote not found in diff (likely hallucination)" });
      continue;
    }

    const dedupeKey = `${raw.constraint_id}|${raw.file ?? ""}|${raw.line ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    findings.push({
      constraintId: raw.constraint_id,
      severity: constraint.enforcement,
      verdict: raw.verdict,
      confidence: raw.confidence,
      file: raw.file,
      line: raw.line,
      evidenceQuote: raw.evidence_quote,
      rationale: raw.rationale,
      suggestion: raw.suggestion,
    });
  }

  // Sort: block first, then warn, then observe; within each, by file/line
  const order: Record<string, number> = { block: 0, warn: 1, observe: 2 };
  findings.sort((a, b) => {
    const so = order[a.severity] - order[b.severity];
    if (so !== 0) return so;
    const fo = (a.file ?? "").localeCompare(b.file ?? "");
    if (fo !== 0) return fo;
    return (a.line ?? 0) - (b.line ?? 0);
  });

  return { findings, insufficientContext: insufficient, dropped };
}

export function quoteAppearsInDiff(quote: string, diffText: string): boolean {
  // Normalize both: strip leading +/-/space, collapse whitespace.
  const normalize = (s: string) =>
    s
      .split("\n")
      .map((l) => l.replace(/^[+\- ]/, "").trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  const needle = normalize(quote);
  if (needle.length < 5) return false;
  const haystack = normalize(diffText);
  if (haystack.includes(needle)) return true;
  // Try a looser substring match on a subset
  const trimmed = needle.length > 80 ? needle.slice(0, 80) : needle;
  return haystack.includes(trimmed);
}

export function exitCodeFor(findings: Finding[], failOn: "block" | "warn" | "observe"): number {
  const order: Record<string, number> = { block: 0, warn: 1, observe: 2 };
  const threshold = order[failOn];
  const hit = findings.some((f) => order[f.severity] <= threshold);
  return hit ? 1 : 0;
}
