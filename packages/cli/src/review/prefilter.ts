import type { Constraint, Diff, FileDiff } from "./types.js";

const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","at","for","with","by","is",
  "are","be","must","never","always","not","no","does","do","this","that",
  "system","user","users","every","any","when","than","from","into","via",
]);

export interface PrefilterDecision {
  constraint: Constraint;
  matched: boolean;
  reason: string;
}

export function prefilter(constraints: Constraint[], diff: Diff): PrefilterDecision[] {
  const decisions: PrefilterDecision[] = [];
  const changedPaths = diff.files.map((f) => f.path);
  const changedTokens = collectChangedTokens(diff.files);

  for (const c of constraints) {
    if (c.enforcement === "block") {
      decisions.push({ constraint: c, matched: true, reason: "block-level: always reviewed" });
      continue;
    }

    if (c.path_globs && c.path_globs.length > 0) {
      const hit = changedPaths.find((p) => c.path_globs!.some((g) => globMatch(g, p)));
      if (hit) {
        decisions.push({ constraint: c, matched: true, reason: `path_globs matched ${hit}` });
        continue;
      }
    }

    const keywords = extractKeywords(c);
    const matched = keywords.find((k) => changedTokens.has(k));
    if (matched) {
      decisions.push({ constraint: c, matched: true, reason: `keyword "${matched}" appears in diff` });
      continue;
    }

    if (!c.path_globs || c.path_globs.length === 0) {
      // No globs declared and no keyword hit — still review at warn/observe level
      // because we can't be confident the constraint is unrelated.
      decisions.push({ constraint: c, matched: true, reason: "no path_globs declared; reviewing conservatively" });
      continue;
    }

    decisions.push({ constraint: c, matched: false, reason: "no path or keyword match" });
  }

  return decisions;
}

function collectChangedTokens(files: FileDiff[]): Set<string> {
  const tokens = new Set<string>();
  for (const f of files) {
    for (const part of f.path.toLowerCase().split(/[\/_.\-]/)) {
      if (part.length >= 3) tokens.add(part);
    }
    for (const h of f.hunks) {
      for (const l of h.lines) {
        if (!l.startsWith("+") && !l.startsWith("-")) continue;
        const body = l.slice(1).toLowerCase();
        for (const w of body.split(/[^a-z0-9_]+/)) {
          if (w.length >= 4 && !STOPWORDS.has(w)) tokens.add(w);
        }
      }
    }
  }
  return tokens;
}

function extractKeywords(c: Constraint): string[] {
  const text = `${c.description} ${c.rationale} ${c.verification_notes ?? ""}`.toLowerCase();
  const words = text.split(/[^a-z0-9_]+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

export function globMatch(pattern: string, path: string): boolean {
  const re = globToRegExp(pattern);
  return re.test(path);
}

function globToRegExp(glob: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 2;
        if (glob[i] === "/") i++;
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if (".+^$()|{}[]\\".includes(c)) {
      re += "\\" + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += "$";
  return new RegExp(re);
}
