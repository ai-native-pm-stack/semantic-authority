# Invoice Processor Review Scenarios

These scenarios exist to make `meaning review` concrete.

They are **seeded review fixtures**, not universal proof that the judge will always be correct. Their job is to show:

- what a block-level regression looks like in diff form
- how a constraint becomes a first-class review target
- where `insufficient_context` should appear when a constraint is too vague

Use them as a local evaluation set when tuning prompts, comparing models, or demonstrating the mechanism.

---

## How to Run

From the repo root:

```bash
npm install --prefix packages/cli
npm run build --prefix packages/cli
export ANTHROPIC_API_KEY=sk-ant-...
```

Then run a seeded review:

```bash
node packages/cli/dist/index.js review \
  --meaning examples/invoice-processor/MEANING.yaml \
  --diff examples/invoice-processor/scenarios/01-pii-redaction.diff
```

For the vague-constraint scenario:

```bash
node packages/cli/dist/index.js review \
  --meaning examples/invoice-processor/scenarios/MEANING.vague.yaml \
  --diff examples/invoice-processor/scenarios/03-vague-runbook.diff
```

---

## Scenario 1 — PII Redaction Regression

Files:

- [01-pii-redaction.diff](/Users/samsonaligba/Projects/meaning/examples/invoice-processor/scenarios/01-pii-redaction.diff)
- constraint: `C-SEC-PII-REDACT-002`

Intent:

- simulates a serializer change that exposes `bank_account_number` in an API response
- should be a strong candidate for a `block` finding

What this demonstrates:

- declared security constraints can participate in PR review
- the finding should point at a real changed line
- the merge gate can fail on a machine-readable rule ID instead of review prose alone

---

## Scenario 2 — Audit Trail Regression

Files:

- [02-audit-trail.diff](/Users/samsonaligba/Projects/meaning/examples/invoice-processor/scenarios/02-audit-trail.diff)
- constraint: `C-ARCH-AUDIT-TRAIL-005`

Intent:

- simulates removing the audit write during an invoice state transition
- should be a strong candidate for a `block` finding

What this demonstrates:

- architectural constraints are reviewable when the relevant behavior is visible in the diff
- the constraint ID becomes a real review handle instead of a sentence in a document

---

## Scenario 3 — Vague Constraint / Insufficient Context

Files:

- [MEANING.vague.yaml](/Users/samsonaligba/Projects/meaning/examples/invoice-processor/scenarios/MEANING.vague.yaml)
- [03-vague-runbook.diff](/Users/samsonaligba/Projects/meaning/examples/invoice-processor/scenarios/03-vague-runbook.diff)
- constraint: `C-OPS-RUNBOOK-009`

Intent:

- introduces a deliberately underspecified operations constraint
- gives the judge a diff that changes a runbook-like document
- should encourage `verdict: insufficient_context`

What this demonstrates:

- some constraints are too vague to review reliably
- `meaning review` is not proof; it is a feedback loop
- the right fix is often to sharpen `MEANING.yaml`, not to trust a shaky judgment

---

## What These Scenarios Do Not Prove

These fixtures do **not** prove:

- global precision or recall across your codebase
- that non-goals are first-class review rules today
- that `meaning review` can replace tests, static analysis, or human review

They are intentionally narrower than that.

They show the current contract:

- `meaning validate` checks the artifact deterministically
- `meaning review` performs probabilistic constraint-risk detection over diffs
- `insufficient_context` is a signal to improve the declaration layer

If you want stronger evidence, the next step is to label outcomes on a growing set of real PRs and track precision / recall over time.
