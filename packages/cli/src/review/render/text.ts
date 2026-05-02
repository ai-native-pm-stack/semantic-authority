import chalk from "chalk";
import type { ReviewResult, Finding } from "../types.js";

export function renderText(result: ReviewResult, opts: { noColor?: boolean } = {}): string {
  const c = opts.noColor ? noColorChalk() : chalk;
  const lines: string[] = [];

  lines.push("");
  lines.push(`meaning review — ${result.system} @ ${result.meaningFile}`);
  lines.push(
    `Diff: ${result.diff.files} files, ${result.diff.lines} lines changed (base: ${result.diff.base})`
  );
  lines.push("");

  const blocks = result.findings.filter((f) => f.severity === "block");
  const warns = result.findings.filter((f) => f.severity === "warn");
  const observes = result.findings.filter((f) => f.severity === "observe");

  for (const f of blocks) lines.push(renderFinding(f, "⛔", c.red));
  for (const f of warns) lines.push(renderFinding(f, "⚠ ", c.yellow));
  for (const f of observes) lines.push(renderFinding(f, "ℹ ", c.blue));

  const reviewed = result.stats.constraintsReviewed;
  const flagged = result.findings.length;
  const clean = reviewed - flagged - result.insufficientContext.length;
  if (clean > 0) {
    lines.push(c.green(`✓  ${clean} other constraint${clean === 1 ? "" : "s"} reviewed, no risk flagged.`));
  }

  if (result.insufficientContext.length > 0) {
    const ids = result.insufficientContext.map((item) => item.constraintId).join(", ");
    lines.push(c.dim(
      `ℹ  ${result.insufficientContext.length} constraint${result.insufficientContext.length === 1 ? "" : "s"} flagged insufficient_context: ${ids}`
    ));
    for (const item of result.insufficientContext) {
      lines.push(...wrap(`${item.constraintId}: ${item.rationale}`, "   ").map((line) => c.dim(line)));
    }
  }

  lines.push("");
  const summary = `Summary: ${blocks.length} block, ${warns.length} warn` +
    (observes.length ? `, ${observes.length} observe` : "") +
    (result.insufficientContext.length ? `, ${result.insufficientContext.length} unclear` : "");
  lines.push(summary);
  lines.push(
    c.dim(
      `Cost: $${result.stats.costUsd.toFixed(3)} (input ${result.stats.inputTokens} tok, output ${result.stats.outputTokens} tok, ${result.stats.calls} call${result.stats.calls === 1 ? "" : "s"})`
    )
  );
  lines.push("");

  return lines.join("\n");
}

function renderFinding(f: Finding, glyph: string, color: (s: string) => string): string {
  const lines: string[] = [];
  const header = `${glyph} AT RISK  ${f.constraintId}  (${f.severity}, ${f.confidence} confidence)`;
  lines.push(color(header));
  if (f.file) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    lines.push(`   ${loc}`);
  }
  lines.push(...wrap(f.rationale, "   "));
  if (f.suggestion) {
    lines.push(...wrap(`Suggest: ${f.suggestion}`, "   "));
  }
  lines.push("");
  return lines.join("\n");
}

function wrap(text: string, indent: string, width = 76): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if ((line + " " + word).trim().length > width) {
        out.push(indent + line.trim());
        line = word;
      } else {
        line += " " + word;
      }
    }
    if (line.trim()) out.push(indent + line.trim());
  }
  return out;
}

function noColorChalk() {
  const id = (s: string) => s;
  return new Proxy({} as typeof chalk, {
    get: () => id,
  });
}
