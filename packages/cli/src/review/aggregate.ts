import type {
  Constraint,
  Confidence,
  Diff,
  Finding,
  InsufficientContextItem,
  JudgeFindingRaw,
} from "./types.js";
import { findDiffFile, lineTouchesDiffHunk } from "./diff.js";

export interface AggregateInput {
  rawFindings: JudgeFindingRaw[];
  constraints: Constraint[];
  diff: Diff;
}

export interface AggregateResult {
  findings: Finding[];
  insufficientContext: InsufficientContextItem[];
  dropped: Array<{ raw: JudgeFindingRaw; reason: string }>;
}

export function aggregate(input: AggregateInput): AggregateResult {
  const byId = new Map(input.constraints.map((c) => [c.id, c]));
  const findings: Finding[] = [];
  const insufficient: InsufficientContextItem[] = [];
  const dropped: Array<{ raw: JudgeFindingRaw; reason: string }> = [];
  const seen = new Set<string>();

  const changedDiffText = input.diff.files
    .map((f) => extractChangedDiffText(f.rawPatch))
    .join("\n");

  for (const raw of input.rawFindings) {
    const constraint = byId.get(raw.constraint_id);
    if (!constraint) {
      dropped.push({ raw, reason: "unknown constraint id" });
      continue;
    }

    if (raw.verdict === "not_at_risk") continue;

    if (raw.verdict === "insufficient_context") {
      if (!insufficient.some((item) => item.constraintId === raw.constraint_id)) {
        insufficient.push({
          constraintId: raw.constraint_id,
          confidence: raw.confidence as Confidence,
          rationale: raw.rationale,
        });
      }
      continue;
    }

    // at_risk — require evidence quote that appears in the diff
    if (!raw.evidence_quote || !quoteAppearsInDiff(raw.evidence_quote, changedDiffText)) {
      dropped.push({ raw, reason: "evidence_quote not found in changed diff lines (likely hallucination)" });
      continue;
    }

    if (!raw.file || !raw.line) {
      dropped.push({ raw, reason: "missing file or line location" });
      continue;
    }

    const diffFile = findDiffFile(input.diff, raw.file);
    if (!diffFile) {
      dropped.push({ raw, reason: "file not present in diff" });
      continue;
    }

    if (!lineTouchesDiffHunk(diffFile, raw.line)) {
      dropped.push({ raw, reason: "line not present in changed diff region" });
      continue;
    }

    const dedupeKey = `${raw.constraint_id}|${diffFile.path}|${raw.line}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    findings.push({
      constraintId: raw.constraint_id,
      severity: constraint.enforcement,
      verdict: raw.verdict,
      confidence: raw.confidence,
      file: diffFile.path,
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
  // Normalize both: strip leading +/- only, collapse whitespace.
  const normalize = (s: string) =>
    s
      .split("\n")
      .map((l) => l.replace(/^[+\-]/, "").trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  const needle = normalize(quote);
  if (needle.length < 5) return false;
  const haystack = normalize(extractChangedDiffText(diffText));
  return haystack.includes(needle);
}

function extractChangedDiffText(rawPatch: string): string {
  return rawPatch
    .split("\n")
    .filter((line) => {
      if (line.startsWith("+++ ") || line.startsWith("--- ")) return false;
      return line.startsWith("+") || line.startsWith("-");
    })
    .join("\n");
}

export function exitCodeFor(findings: Finding[], failOn: "block" | "warn" | "observe"): number {
  const order: Record<string, number> = { block: 0, warn: 1, observe: 2 };
  const threshold = order[failOn];
  const hit = findings.some((f) => order[f.severity] <= threshold);
  return hit ? 1 : 0;
}
