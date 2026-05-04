# `meaning review` — Drift Detection On Every PR

`meaning drift <diff>` is the semantic-drift surface. `meaning review <diff>` is the PR / CI surface. Today they share the same engine.

Both commands load `MEANING.yaml`, resolve a code diff, and ask an LLM judge whether any declared constraint is plausibly at risk. Findings cite the constraint ID, file, and line. CI can fail when findings meet or exceed your `--fail-on` threshold.

This is the missing piece between "we wrote down the constraints" and "the constraints actually constrain the code."

Two important truths:

- `meaning validate` is **deterministic** schema and semantic hygiene validation.
- `meaning review` is **probabilistic** model-mediated review. It is best used as an additional review-and-gate layer alongside tests, type-checking, and human review, not as formal proof that a change is safe.
- Review results are cached locally and in the GitHub Action by `(diff_hash, meaning_hash, model_id, provider)` so repeated PR pushes do not need to repay the same model call.

---

## Local developer flow

```bash
npm install --prefix packages/cli
npm run build --prefix packages/cli
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-proj-...

# From a checkout of this repo:
node packages/cli/dist/index.js drift --base origin/main
node packages/cli/dist/index.js review --base origin/main
node packages/cli/dist/index.js review --provider openai --model gpt-5.4-mini --base origin/main

# After npm publish, the same command becomes:
# meaning drift --base origin/main
# meaning review --base origin/main
```

Output:

```
meaning review — invoice-processor @ MEANING.yaml
Diff: 7 files, 142 lines changed (base: origin/main)

⛔ AT RISK  C-FIN-NO-DOUBLE-PAY-001  (block, high confidence)
   src/payments/submit.ts:42
   New retry path in submitPayment() re-enters chargeProvider() without
   checking the (vendor_id, invoice_number) idempotency key.
   Suggest: assert idempotency before retry, or add integration test
   covering concurrent resubmit.

⚠  AT RISK  C-PERF-SEARCH-P95-004  (warn, medium confidence)
   src/search/query.ts:88
   Removed index hint on (vendor_id, created_at); query now filters
   by created_at alone. Likely regression on large vendor histories.

✓  6 other constraints reviewed, no risk flagged.

Summary: 1 block, 1 warn — exit 1
Cost: $0.043 (input 12,400 tok, output 1,820 tok, 1 call)
```

Common variants:

```bash
meaning drift --base origin/main                    # drift-focused local run
meaning review --staged                            # pre-commit check
meaning review --base origin/release/1.4           # non-main base
meaning review --diff path/to/patch.diff           # from file
git diff main...feature | meaning review -         # from stdin
meaning review --format json                       # machine-readable
meaning review --only block                        # suppress warns
meaning review --sarif-output meaning-review.sarif # text + SARIF in one run
meaning review --budget-usd 0.25                   # cap spend per run
meaning review --cache-dir .meaning-cache/review   # override cache location
meaning review --no-cache                          # force a fresh judge call
```

---

## CI flow (GitHub PR)

```yaml
# .github/workflows/meaning.yml
on: pull_request
jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write    # for SARIF upload
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: ai-native-pm-stack/semantic-authority/action@v0.2.0-alpha
        with:
          mode: review
          base: ${{ github.base_ref }}
          fail-on: block
          provider: anthropic
          cache: true
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

What the developer sees on the PR:

1. **Inline annotations** on changed lines (from SARIF upload). Clicking shows the constraint ID, rationale, and suggestion.
2. **Check status** — green if no `block` findings, red if any. Adding the check to required-status-checks on `main` makes block findings actually block merge.
3. **Security tab** — findings appear under Code scanning alerts, grouped by constraint ID as the rule.

---

## End-to-end example

A developer adds a retry loop to `submitPayment()` and pushes the branch.

1. CI runs `meaning review --base origin/main --format text --sarif-output meaning-review.sarif`.
2. The CLI loads `MEANING.yaml`, resolves the diff, and pre-filters constraints to those whose `path_globs` match the changed files plus all `block`-level constraints.
3. It calls the configured LLM provider once with the constraints + full changed-file context + diff. The model returns findings via a forced `report_findings` tool call.
4. The same review result is rendered to both the workflow summary and SARIF; SARIF is uploaded; the PR check goes red; an annotation lands on `src/payments/submit.ts:42` citing `C-FIN-NO-DOUBLE-PAY-001`.
5. Developer reads the rationale, adds the idempotency assert, pushes again.
6. CI re-runs; if the diff/meaning tuple is unchanged the cached result is reused, otherwise the judge re-evaluates the new diff, the finding clears, the check goes green, and merge is unblocked.

---

## Failure modes and exit codes

| Code | Meaning |
|---|---|
| 0 | No findings at or above `--fail-on` |
| 1 | Findings at or above `--fail-on` |
| 2 | Configuration or input error (bad MEANING.yaml, no diff, missing API key) |
| 3 | Budget exceeded; no API call made |
| 4 | API error after retries |

Common situations:

- **No API key in CI** → exit 2, with a setup link.
- **Diff too large for budget** → exit 3, "split or raise `--budget-usd`."
- **Anthropic or OpenAI outage** → retries, then exit 4. Teams can set `continue-on-error: true` until the gate is trusted.
- **Vague constraint** → verdict comes back `insufficient_context`; surfaced as a notice, not a block. That is the signal to sharpen `MEANING.yaml`.
- **False positives / false negatives** → this is why `meaning review` should be framed as constraint-risk detection, not proof. Keep the gate narrow at first (`fail-on: block`), keep tests in place, and tune constraints with real review feedback.

---

## What this changes in day-to-day work

- `MEANING.yaml` becomes a living artifact because the judge cites it on every PR. Stale or vague constraints get noticed.
- Constraint IDs become real foreign keys — they show up in PR annotations, SARIF rules, and review comments.
- Declared constraints can now participate in review and merge gating instead of sitting as inert prose in a document.

---

## Reproducible review scenarios

The fastest way to understand the mechanism is to run it against seeded diffs instead of trusting the manifesto.

See [examples/invoice-processor/SCENARIOS.md](../examples/invoice-processor/SCENARIOS.md) for three concrete cases:

- a block-level PII redaction regression
- a block-level audit trail regression
- a deliberately vague constraint that returns `insufficient_context`

See [examples/invoice-processor/AGENT_EXAMPLE.md](../examples/invoice-processor/AGENT_EXAMPLE.md) for a small before/after illustration of how the same request behaves with and without `MEANING.yaml` context.

Scope today:

- Constraints are first-class drift / review targets today.
- Non-goals are compiled into synthetic **warn-level** review targets so scope creep can be surfaced in review without pretending every non-goal is a hard block by default.
- `insufficient_context` is the signal that a constraint is too vague to review reliably and should be sharpened.

---

## Limitations

- Reasons over the diff plus full text of changed files. Does not chase call graphs across files.
- Changed-file context is included only when the file is available from the workspace or the base revision and stays under the line cap; otherwise the judge falls back to diff-only context for that file.
- Cache persistence across GitHub-hosted runs depends on the built-in `actions/cache` layer. If teams disable it, the CLI still caches locally within the job workspace but hosted runners will start fresh on the next run.
- Auto-fix is not in scope; suggestions are text only.

---

## Evaluation

This repo currently includes:

- deterministic validation tests for the artifact and CLI behavior
- seeded review scenarios for constraint-risk detection
- a simple agent-behavior illustration in the invoice-processor example

It does **not** yet include:

- a labeled benchmark with measured precision / recall
- telemetry from external repos
- a published before/after incident dataset

That evidence layer is the next step. The most useful first measurements are:

- precision of `block` findings on labeled PRs
- recall on seeded constraint violations
- rate of `insufficient_context` findings that lead to sharper constraints
- reduction in scope-drift or non-goal violations after adoption
- one published dogfood example showing SARIF annotations on a real PR, not just the invoice-processor fixtures

Full design, success metrics, risks, and engineering workstreams: [PRD_MEANING_REVIEW.md](../PRD_MEANING_REVIEW.md).
