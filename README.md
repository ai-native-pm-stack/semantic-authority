# Semantic Authority

**Make system meaning explicit, machine-legible, and reviewable — with optional merge gating — on every PR.**

CLAUDE.md tells agents *how to work*. **MEANING.yaml tells them *what the work must mean*.**

> **Honest status (May 2026):** This repo now includes the *declaration*, *context*, and *enforcement* layers. `meaning review` is implemented in-source, tested locally, and the GitHub Action wiring is present in this repo. The remaining release gap is distribution: the public npm package for `@semantic-authority/cli` has not been published yet, so the turnkey `npx` / external GitHub Action install path is not live yet. Until npm is published, use the local source checkout path in [`packages/cli/README.md`](./packages/cli/README.md).

---

## The Problem

AI has made execution cheap. Agents generate code, write tests, and ship features faster than any human team. But speed without shared understanding produces **fast drift** — systems that evolve rapidly toward incoherence.

When a constraint is unstated, an agent doesn't ask for clarification. It picks a plausible interpretation and executes. **Silence is interpreted as permission.**

The bottleneck has moved. It is no longer "can we build this?" It is **"do we agree on what this should mean?"**

---

## What MEANING Is — and Is Not

`MEANING.yaml` does **not** replace your PRD, ADRs, RFCs, OpenAPI spec, or `CLAUDE.md`.

It is the **smallest canonical subset of system intent** that humans, agents, and CI should all share.

- **PRD / BRD** explains the product narrative, user value, market context, and roadmap.
- **ADR / RFC** records design decisions, alternatives, and technical history.
- **OpenAPI / schema files** define interface shape and structure.
- **CLAUDE.md / AGENTS.md / prompts** tell agents how to work in a repo.
- **MEANING.yaml** declares what must hold, what is explicitly out of scope, and which constraints are important enough to review or gate on.

Use this rule of thumb:

- If it needs prose, politics, or historical context, keep it in the source docs.
- If it must be machine-consumable by agents or checked in review, promote the **minimal canonical form** into `MEANING.yaml`.

That means `MEANING.yaml` is a **supplement and compiler target**, not a replacement artifact.

It also serves **two different consumers**:

- humans need a precise, governable declaration they can review and update
- agents need a generated, repo-local context projection they can consume during execution

That is why this repo keeps:

- `MEANING.yaml` as the canonical semantic contract
- `.claude/meaning-context.md` as the generated agent-facing projection

One source of truth. Different consumption modes.

---

## The Mental Model

```
              WHO CREATES MEANING?
                     │
              ┌──────┴──────┐
              │   Humans    │
              │  (PM, Arch, │
              │   Eng Lead) │
              └──────┬──────┘
                     │
               writes / updates
                     │
                     ▼
             ┌───────────────┐
             │ MEANING.yaml  │  ◄── The Artifact
             │               │      (lives in your repo root)
             │ • goals       │
             │ • non-goals   │
             │ • constraints │
             │ • trade-offs  │
             │ • drift policy│
             └───────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Devs    │ │ AI Agents│ │    CI    │
  │          │ │ (Claude, │ │ Pipeline │
  │ Read it  │ │  Cursor) │ │          │
  │ before   │ │ Consume  │ │ Enforce  │
  │ coding   │ │ it as    │ │ it as    │
  │          │ │ context  │ │ gates    │
  └──────────┘ └──────────┘ └──────────┘
```

## Useful To Every Role

Semantic Authority works best when it is **layered**, not when everyone is forced through the same interface.

The same repo should offer different kinds of value:

| Audience | What They Need | Where They Start |
|-------|------|-----|
| **PMs / non-technical operators** | A way to make goals, non-goals, trade-offs, and assumptions explicit | [GUIDE.md](./GUIDE.md), [docs/GENERATE_MEANING_PROMPT.md](./docs/GENERATE_MEANING_PROMPT.md) |
| **Engineers / architects** | A canonical semantic contract that can be validated, reviewed, and discussed in PRs | [README.md](./README.md), [packages/cli/README.md](./packages/cli/README.md), [examples/invoice-processor/SCENARIOS.md](./examples/invoice-processor/SCENARIOS.md) |
| **Agents** | A machine-consumable source of truth and a generated execution context | [AGENTS.md](./AGENTS.md), `meaning context`, `.claude/meaning-context.md` |
| **Leads / the organization** | Lower drift, clearer ownership, and a shared vocabulary for what the system is allowed to mean | `MEANING.yaml`, review outputs, drift policy, PR discussions |

That is the intended shape of the project:

- not just a PM artifact
- not just a dev tool
- not just an agent prompt file

It is a shared semantic layer with different projections for each part of the team.

---

**Three layers:**

| Layer | What | Who | Status |
|-------|------|-----|--------|
| **Education** | Docs teach why this matters and how to write MEANING.yaml | Everyone | ✅ Shipped |
| **Artifact** | MEANING.yaml declares what the system means | PM, Architect, Tech Lead (authors); Devs + Agents (consumers) | ✅ Shipped |
| **Schema validation** | `meaning validate` + Action confirm the file is well-formed | CI | ✅ Shipped |
| **Agent context** | `meaning context` emits a Claude-loadable context file | Devs, Agents | ✅ Shipped (Claude); Cursor/Copilot emitters are roadmap |
| **Semantic review + gating** | `meaning review <diff>` asks an LLM judge whether a diff plausibly puts any constraint at risk and can fail CI on `block`-level findings | CI, Devs | ✅ Implemented in-source; public install path pending npm publish |

---

## Quickstart

> **Current install path:** until `@semantic-authority/cli` is published to npm, build the CLI from this repo once with `npm install --prefix packages/cli && npm run build --prefix packages/cli`, then replace `meaning ...` / `npx @semantic-authority/cli ...` with `node packages/cli/dist/index.js ...`.

### 1. Create a MEANING.yaml

```bash
node packages/cli/dist/index.js init
# After npm publish:
# npx @semantic-authority/cli init
```

Interactive wizard asks: system name, primary goal, non-goals, first constraints. Generates `MEANING.yaml` at your repo root and `.claude/meaning-context.md` for agent consumption.

### 2. Validate it

```bash
node packages/cli/dist/index.js validate
# After npm publish:
# npx @semantic-authority/cli validate
```

Checks schema, constraint ID format, minimum non-goals, enforcement levels.

### 3. Generate agent context

```bash
node packages/cli/dist/index.js context
# After npm publish:
# npx @semantic-authority/cli context
```

Converts MEANING.yaml into a `.claude/meaning-context.md` that Claude Code, Cursor, or any LLM agent can consume. Append to your CLAUDE.md or load as a skill.

### 4. CI status

The composite GitHub Action is implemented in [action/action.yml](./action/action.yml), including `mode: review`, one-pass SARIF generation, and merge gating. It is **not yet turnkey for external repos** because it currently installs `@semantic-authority/cli` from npm, and the npm package is not published yet.

What you can do right now:

- run `meaning validate`, `meaning context`, and `meaning review` from a local source checkout
- use the Action definition in this repo as the reference workflow shape
- publish the npm package later to make `npx` and external Action usage turnkey

After npm publish, this is the intended external CI workflow:

```yaml
# .github/workflows/meaning.yml
name: Meaning Gate
on: [pull_request]
jobs:
  meaning:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: ai-native-pm-stack/semantic-authority/action@v0.1.0
        with:
          mode: both
          fail-on: block
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## `meaning review` — Enforcement on every PR

`meaning review <diff>` is the command that makes the declaration layer operational in code review. It loads `MEANING.yaml`, resolves a code diff, and asks an LLM judge whether any declared constraint is plausibly at risk. Findings cite the constraint ID, file, and line. CI can fail when findings meet or exceed your `--fail-on` threshold.

This is the missing piece between "we wrote down the constraints" and "the constraints actually constrain the code."

Two important truths:

- `meaning validate` is **deterministic** schema and semantic hygiene validation.
- `meaning review` is **probabilistic** model-mediated review. It is best used as an additional review-and-gate layer alongside tests, type-checking, and human review, not as formal proof that a change is safe.

### Local developer flow

```bash
npm install --prefix packages/cli
npm run build --prefix packages/cli
export ANTHROPIC_API_KEY=sk-ant-...

# From a checkout of this repo:
node packages/cli/dist/index.js review --base origin/main

# After npm publish, the same command becomes:
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
meaning review --staged                            # pre-commit check
meaning review --base origin/release/1.4           # non-main base
meaning review --diff path/to/patch.diff           # from file
git diff main...feature | meaning review -         # from stdin
meaning review --format json                       # machine-readable
meaning review --only block                        # suppress warns
meaning review --sarif-output meaning-review.sarif # text + SARIF in one run
meaning review --budget-usd 0.25                   # cap spend per run
```

### CI flow (GitHub PR)

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
      # This is the post-npm-publish path. Until then, use the in-repo
      # CLI from source as described above.
      - uses: ai-native-pm-stack/semantic-authority/action@v0.1.0
        with:
          mode: review
          base: ${{ github.base_ref }}
          fail-on: block
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

What the developer sees on the PR:

1. **Inline annotations** on changed lines (from SARIF upload). Clicking shows the constraint ID, rationale, and suggestion.
2. **Check status** — green if no `block` findings, red if any. Adding the check to required-status-checks on `main` makes block findings actually block merge.
3. **Security tab** — findings appear under Code scanning alerts, grouped by constraint ID as the rule.

### End-to-end example

A developer adds a retry loop to `submitPayment()` and pushes the branch.

1. CI runs `meaning review --base origin/main --format text --sarif-output meaning-review.sarif`.
2. The CLI loads `MEANING.yaml`, resolves the diff, and pre-filters constraints to those whose `path_globs` match the changed files plus all `block`-level constraints.
3. It calls Claude once with the constraints + diff. Claude returns one finding via a forced `report_findings` tool call.
4. The same review result is rendered to both the workflow summary and SARIF; SARIF is uploaded; the PR check goes red; an annotation lands on `src/payments/submit.ts:42` citing `C-FIN-NO-DOUBLE-PAY-001`.
5. Developer reads the rationale, adds the idempotency assert, pushes again.
6. CI re-runs; the judge now sees the assert in the diff; finding clears; check goes green; merge unblocked.

### Failure modes and exit codes

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
- **Anthropic outage** → retries, then exit 4. Teams can set `continue-on-error: true` until the gate is trusted.
- **Vague constraint** → verdict comes back `insufficient_context`; surfaced as a notice, not a block. That is the signal to sharpen `MEANING.yaml`.
- **False positives / false negatives** → this is why `meaning review` should be framed as constraint-risk detection, not proof. Keep the gate narrow at first (`fail-on: block`), keep tests in place, and tune constraints with real review feedback.

### What this changes in day-to-day work

- `MEANING.yaml` becomes a living artifact because the judge cites it on every PR. Stale or vague constraints get noticed.
- Constraint IDs become real foreign keys — they show up in PR annotations, SARIF rules, and review comments.
- Declared constraints can now participate in review and merge gating instead of sitting as inert prose in a document.

### Reproducible review scenarios

The fastest way to understand the mechanism is to run it against seeded diffs instead of trusting the manifesto.

See [examples/invoice-processor/SCENARIOS.md](./examples/invoice-processor/SCENARIOS.md) for three concrete cases:

- a block-level PII redaction regression
- a block-level audit trail regression
- a deliberately vague constraint that returns `insufficient_context`

Current scope note:

- Constraints are first-class review targets today.
- Non-goals guide humans and agents, but they are **not yet compiled into first-class review rules** by `meaning review`.
- `insufficient_context` is the signal that a constraint is too vague to review reliably and should be sharpened.

### Current review limitations

- Reasons over the diff plus full text of changed files. Does not chase call graphs across files.
- Anthropic-only. Provider abstraction is a v0.3.0 concern.
- No cross-run finding cache yet.
- Auto-fix is not in scope; suggestions are text only.

Full design, success metrics, risks, and engineering workstreams: [PRD_MEANING_REVIEW.md](./PRD_MEANING_REVIEW.md).

---

## What's in MEANING.yaml?

```yaml
system: invoice-processor
version: 1.0.0
status: active
owner: finance-engineering
last_reviewed: 2026-03-09

goal:
  primary: >
    Enable finance teams to submit, approve, and track invoices
    with automated compliance checks and audit trails.
  success_criteria:
    - "Invoice submitted to fully approved in under 48 hours for standard amounts"
    - "Zero duplicate payments for the same vendor and invoice number"
  non_goals:
    - "Does not handle payment execution — delegates to bank integration"
    - "Does not support expense report or reimbursement workflows in v1"
    - "Does not provide tax calculation or filing"
    - "Does not manage vendor onboarding or KYC"
    - "Does not support multi-currency invoices in v1 — all amounts in USD"

constraints:
  - id: C-FIN-NO-DOUBLE-PAY-001
    description: "An invoice must never be paid twice for the same vendor and invoice number"
    category: business
    enforcement: block
    owner: finance-engineering
    rationale: "Duplicate payments cause direct financial loss"
    source: declared
    confidence: high

  - id: C-SEC-PII-REDACT-002
    description: "System must never expose vendor bank account numbers in API responses or logs"
    category: security
    enforcement: block
    owner: security
    rationale: "Bank account numbers are sensitive financial PII"
    source: declared
    confidence: high

  - id: C-PERF-SEARCH-P95-004
    description: "Invoice search P95 latency must remain under 500ms"
    category: operational
    enforcement: warn
    owner: finance-engineering
    rationale: "Slow search blocks month-end reconciliation"
    source: declared
    confidence: medium

trade_offs:
  chosen:
    approach: "Optimistic locking for concurrent invoice approvals"
    rationale: "Approval conflicts are rare; avoids blocking the common path"
  rejected:
    - alternative: "Pessimistic locking with row-level locks"
      reason: "Adds 50-100ms latency and deadlock risk under load"
      revisit_condition: "If approval conflicts exceed 1% of total approvals"

drift_policy:
  review_cadence: monthly
  enforcement_rules:
    block: "Violation must not merge without remediation or an approved drift record"
    warn: "Acknowledgement required with owner and revisit date"
    observe: "Logged for trend analysis; reviewed monthly"
```

---

## Docs

| Document | Audience | What It Covers |
|----------|----------|----------------|
| [MANIFESTO.md](./MANIFESTO.md) | Everyone | Why Semantic Authority exists — the philosophical anchor |
| [GUIDE.md](./GUIDE.md) | PMs, Architects, Tech Leads | How to write a MEANING.yaml — step-by-step, checklists, FAQ |
| [AGENTS.md](./AGENTS.md) | Engineers, Agent builders | How AI agents consume MEANING.yaml — operating modes, multi-agent coordination |
| [docs/GENERATE_MEANING_PROMPT.md](./docs/GENERATE_MEANING_PROMPT.md) | PMs, anyone with a BRD/PRD | LLM prompt template to generate a draft MEANING.yaml from existing product docs |
| [packages/cli/README.md](./packages/cli/README.md) | Engineers, maintainers | CLI install, commands, and smoke-test path |
| [action/README.md](./action/README.md) | Engineers, DevOps | GitHub Action usage and release-state notes |
| [PRD_MEANING_REVIEW.md](./PRD_MEANING_REVIEW.md) | Maintainers, contributors | Full PRD + ERD for the `meaning review` enforcement build |

---

## How Different Roles Use This

**Product Managers** author and update MEANING.yaml — writing goals, non-goals, and trade-offs. They review drift reports to understand where the system is diverging from intent. Have an existing BRD/PRD? Use the [generation prompt](./docs/GENERATE_MEANING_PROMPT.md) to create a draft MEANING.yaml with any LLM, or use the Claude Code skill (`skills/generate-meaning.md`) to generate one directly in your IDE.

**Architects & Tech Leads** author constraints and enforcement levels. They run `meaning validate` during design reviews. They review cross-system meaning coherence when constraints in one service affect another.

**Engineers** read MEANING.yaml before writing code. They can run `meaning review` locally from source today, and once npm is published the same workflow becomes a drop-in CLI / Action experience with inline PR annotations citing the constraint IDs their diff puts at risk.

**AI Agents** (Claude Code today; Cursor and Copilot emitters on the v0.3.0 roadmap) receive auto-generated context from `meaning context`. They know the system's goals, respect its non-goals, honor its constraints by ID, and understand its trade-offs before writing a single line of code.

**CI Pipelines** can already use the in-repo implementation as the reference gating flow. The public turnkey path for external repos lands once `@semantic-authority/cli` is published to npm, because the composite Action currently installs the CLI from npm.

---

## Keeping It Fresh

A monthly review cadence alone is not enough. `MEANING.yaml` stays useful when review is triggered by events, not just calendars.

Update or revisit it when:

- a new `block`-level invariant appears
- an incident reveals an unstated assumption
- `meaning review` returns `insufficient_context`
- a team intentionally crosses a declared non-goal
- a release changes system boundaries or trade-offs
- an ADR materially changes architecture that a constraint depends on

The best cadence is usually:

- **event-driven review** for meaningful change
- **periodic review** as a backstop

---

## What Ships vs. What's Generated

The `.claude/` directory is **not** part of this package. It is a generated **output** in your project.

| File | Where It Lives | Who Creates It | Committed? |
|------|---------------|----------------|------------|
| `MEANING.yaml` | **Your repo root** | You (human) | ✅ Yes — this is your source of truth |
| `.claude/meaning-context.md` | **Your repo** `.claude/` | `meaning context` (auto-generated) | ❌ No — regenerate from MEANING.yaml anytime |
| `@semantic-authority/cli` | **This repo today; npm registry after publish** | This project | N/A — run from `packages/cli/dist/index.js` today, then via `npx` / global install after npm publish |

**Flow:** You write `MEANING.yaml` → CLI reads it → generates `.claude/meaning-context.md` → Claude Code auto-loads it.

Add `.claude/meaning-context.md` to your project's `.gitignore`. It's a build artifact, not a source file.

---

## Repo Structure

```
semantic-authority/
├── README.md              ← You are here
├── MANIFESTO.md           ← Why (1 page)
├── GUIDE.md               ← How to write MEANING.yaml
├── AGENTS.md              ← How agents consume it
├── LICENSE
│
├── docs/
│   └── GENERATE_MEANING_PROMPT.md  ← LLM prompt to generate from BRD/PRD
│
├── skills/
│   └── generate-meaning.md         ← Claude Code skill for generation
│
├── packages/cli/          ← The `meaning` CLI
│   ├── package.json
│   ├── src/
│   │   ├── commands/      ← init, validate, context, review
│   │   └── schema/        ← JSON Schema for MEANING.yaml
│   └── tests/
│
├── action/                ← GitHub Action wrapper
│   └── action.yml
│
└── examples/
    └── invoice-processor/ ← Worked example
        └── MEANING.yaml
```

---

## The Core Principle

> Tests enforce behavior.
> Specs describe intent.
> Prompts influence execution.
> **Semantic Authority defines validity.**
>
> Tests are the operational floor.
> Authority is the semantic ceiling.
> Between them, drift becomes visible.

---

## License

MIT License — Copyright 2026 Samson Aligba

---

Maintained as part of the AI Native PM Stack.
