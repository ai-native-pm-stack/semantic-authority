# Semantic Authority

**Turn product intent into machine-legible meaning that humans, agents, and CI can share — and review against real code changes.**

CLAUDE.md tells agents *how to work*. **MEANING.yaml tells them *what the work must mean*.**

Semantic Authority is the framework. `MEANING.yaml` is the canonical artifact. Humans author and ratify it; humans, agents, and CI consume it in different ways.

Semantic Authority makes a product team's goals, non-goals, and constraints machine-enforceable in CI — the PM office authors the boundaries, an LLM judge flags risk, and deterministic checks decide what blocks a merge.

This is the **meaning layer** of the AI Native PM Stack:

- **PMs / product leaders** make intent explicit
- **engineers and agents** execute within that declared meaning
- **CI** reviews and gates drift against the same contract

---

## The Problem

AI has made execution cheap. Agents generate code, write tests, and ship features faster than any human team. But speed without shared understanding produces **fast drift** — systems that evolve rapidly toward incoherence.

When a constraint is unstated, an agent doesn't ask for clarification. It picks a plausible interpretation and executes. **Silence is interpreted as permission.**

The bottleneck has moved. It is no longer "can we build this?" It is **"do we agree on what this should mean?"**

---

## What MEANING Is — and Is Not

`MEANING.yaml` does **not** replace your PRD, ADRs, RFCs, OpenAPI spec, or `CLAUDE.md`. It is the **smallest canonical subset of system intent** that humans, agents, and CI should all share.

- **PRD / BRD** explains the product narrative, user value, market context, and roadmap.
- **ADR / RFC** records design decisions, alternatives, and technical history.
- **OpenAPI / schema files** define interface shape and structure.
- **CLAUDE.md / AGENTS.md / prompts** tell agents how to work in a repo.
- **MEANING.yaml** declares what must hold, what is explicitly out of scope, and which constraints are important enough to review or gate on.

Rule of thumb:

- If it needs prose, politics, or historical context, keep it in the source docs.
- If it must be machine-consumable by agents or checked in review, promote the **minimal canonical form** into `MEANING.yaml`.

`MEANING.yaml` is a **supplement and compiler target**, not a replacement artifact.

It serves two consumers:

- humans need a precise, governable declaration they can review and update — `MEANING.yaml` itself
- agents need a generated, repo-local context projection they can consume during execution — `.claude/meaning-context.md`

One source of truth. Different consumption modes. The diagram and per-role breakdown live in [docs/MENTAL_MODEL.md](./docs/MENTAL_MODEL.md).

---

## What Ships Today

| Layer | Surface | Status |
|-------|---------|--------|
| Education | [GUIDE.md](./GUIDE.md), [MANIFESTO.md](./MANIFESTO.md), [AGENTS.md](./AGENTS.md) | ✅ Shipped |
| Artifact | `MEANING.yaml` + JSON Schema | ✅ Shipped |
| Schema validation | `meaning validate` + GitHub Action | ✅ Shipped |
| Agent context | `meaning context` (Claude today; Cursor / Copilot emitters on roadmap) | ✅ Shipped |
| Semantic drift detection + gating | `meaning review <diff>` / `meaning drift <diff>` — LLM judge cites constraint IDs and can fail CI on `block`-level findings | ✅ Shipped from source + GitHub Action; npm publish is a convenience roadmap item |

The review surface is the one that earns the "enforce meaning" claim. Full usage guide: [docs/REVIEW.md](./docs/REVIEW.md).

---

## Quickstart

Until `@semantic-authority/cli` is published to npm, build the CLI from this repo once:

```bash
npm install --prefix packages/cli
npm run build --prefix packages/cli
```

Then run commands via `node packages/cli/dist/index.js ...`.

### 1. Create a MEANING.yaml

```bash
node packages/cli/dist/index.js init
```

Interactive wizard asks for system name, primary goal, non-goals, and first constraints. Generates `MEANING.yaml` at your repo root and `.claude/meaning-context.md` for agent consumption.

### 2. Validate it

```bash
node packages/cli/dist/index.js validate
```

Checks schema, constraint ID format, minimum non-goals, enforcement levels.

### 3. Generate agent context

```bash
node packages/cli/dist/index.js context
```

Converts `MEANING.yaml` into a `.claude/meaning-context.md` that Claude Code, Cursor, or any LLM agent can consume. Append to your CLAUDE.md or load as a skill.

### 4. Review code changes against MEANING.yaml

```bash
export OPENAI_API_KEY=sk-proj-...
# or: export ANTHROPIC_API_KEY=sk-ant-...

node packages/cli/dist/index.js review --provider openai --model gpt-5.4-mini --base origin/main
```

Block-level findings exit non-zero. Anthropic and OpenAI are both supported. See [docs/REVIEW.md](./docs/REVIEW.md) for local + CI flows, output formats, exit codes, cost controls, and limitations.

### 5. Wire up CI

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
        with: { fetch-depth: 0 }
      - uses: ai-native-pm-stack/semantic-authority/action@v0.2.0-alpha
        with:
          mode: both
          fail-on: block
          provider: anthropic
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## Current Evidence

This repo now includes two benchmark classes:

- a **governed benchmark** on Orlo, using a maintained internal
  `docs/MEANING.yaml`
- a **ported benchmark** on the public [`project-blinc/Blinc`](https://github.com/project-blinc/Blinc)
  repository, using a bootstrapped `MEANING.yaml` derived from public docs

### Governed benchmark: Orlo

Orlo is the stronger evidence anchor because the codebase already has an owned
meaning artifact and the benchmark measures the review path against that
declared contract:

- on this sample, the OpenAI path is within the PRD latency and cost targets (`M3`, `M4`)
- provider / model: `openai` / `gpt-5.4-mini`
- 10 recent commit diffs
- successful runs: `10 / 10`
- average latency: `11.3s`
- p95 latency: `17.6s`
- average review cost: `$0.0240`
- p95 review cost: `$0.0806`
- `0` at-risk findings; `111` `insufficient_context` verdicts, indicating that
  constraint specificity is the current bottleneck on this codebase, not judge sensitivity
- worst case in this sample (`sample_10`: `48` files, `9,072` lines) completed
  in `17.6s` for `$0.0806` — still inside the PRD targets
- the estimator is calibrated within about `15%` in the conservative direction
  on this dataset, so teams can use `--mode estimate` to budget review cost
  without burning API spend

What the Orlo benchmark proves:

- the pipeline runs end-to-end on a real codebase with real diff shapes
- latency and cost are inside the current PRD targets
- `insufficient_context` is a real, load-bearing output rather than a paper concept

Artifacts:

- [docs/evidence/ORLO_DOGFOOD.md](./docs/evidence/ORLO_DOGFOOD.md)
- [docs/evidence/orlo-dogfood-live.json](./docs/evidence/orlo-dogfood-live.json)
- [docs/evidence/orlo-dogfood-estimate.json](./docs/evidence/orlo-dogfood-estimate.json)

### OSS portability benchmark: Blinc

Blinc is the external-validity check. It did not originally ship with a
`MEANING.yaml`, so the benchmark uses a ported artifact derived from public
docs and repo metadata:

- provider / model: `openai` / `gpt-5.4-mini`
- 10 recent reviewable commit diffs
- successful runs: `10 / 10`
- average latency: `2.95s`
- p95 latency: `3.57s`
- average review cost: `$0.0041`
- p95 review cost: `$0.0097`
- `0` at-risk findings and `0` `insufficient_context` verdicts on this sample
- the estimator is calibrated within about `4%` in the conservative direction
  on this dataset
- worst case in this sample (`sample_10`: `5` files, `615` lines) completed in
  `3.07s` for `$0.0097`

What the Blinc benchmark proves:

- the review pipeline transfers to a public repo that did not start
  AI-native
- a bootstrapped `MEANING.yaml` can still support cheap, successful live runs
- the estimate mode remains a practical budgeting surface on a second codebase

Artifacts:

- [docs/evidence/blinc/README.md](./docs/evidence/blinc/README.md)
- [docs/evidence/blinc/blinc-dogfood-live.json](./docs/evidence/blinc/blinc-dogfood-live.json)
- [docs/evidence/blinc/blinc-dogfood-estimate.json](./docs/evidence/blinc/blinc-dogfood-estimate.json)

What these benchmarks do not yet show:

- labeled precision / recall
- one published SARIF artifact or screenshot from a real PR

---

## What MEANING.yaml Looks Like

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
    path_globs: ["src/payments/**", "src/billing/**"]

  - id: C-SEC-PII-REDACT-002
    description: "System must never expose vendor bank account numbers in API responses or logs"
    category: security
    enforcement: block
    owner: security
    rationale: "Bank account numbers are sensitive financial PII"
    source: declared
    confidence: high
```

Full worked example: [examples/invoice-processor/MEANING.yaml](./examples/invoice-processor/MEANING.yaml).

---

## Docs

| Document | Audience | Covers |
|----------|----------|--------|
| [GUIDE.md](./GUIDE.md) | PMs, Architects, Tech Leads | How to write a MEANING.yaml — step-by-step, checklists, FAQ |
| [docs/MENTAL_MODEL.md](./docs/MENTAL_MODEL.md) | Everyone | Mental model diagram + per-role usage breakdown |
| [docs/REVIEW.md](./docs/REVIEW.md) | Engineers, DevOps | `meaning review` usage, CI flow, exit codes, limitations |
| [AGENTS.md](./AGENTS.md) | Engineers, Agent builders | How AI agents consume MEANING.yaml |
| [MANIFESTO.md](./MANIFESTO.md) | Everyone | Why Semantic Authority exists |
| [docs/GENERATE_MEANING_PROMPT.md](./docs/GENERATE_MEANING_PROMPT.md) | PMs with a BRD/PRD | LLM prompt template to draft a MEANING.yaml from existing docs |
| [packages/cli/README.md](./packages/cli/README.md) | Engineers, maintainers | CLI install, commands, smoke-test path |
| [action/README.md](./action/README.md) | Engineers, DevOps | GitHub Action usage and release-state notes |
| [PRD_MEANING_REVIEW.md](./PRD_MEANING_REVIEW.md) | Maintainers, contributors | Full PRD + ERD for the `meaning review` enforcement build |
| [examples/invoice-processor/SCENARIOS.md](./examples/invoice-processor/SCENARIOS.md) | Anyone evaluating | Three runnable review scenarios |
| [docs/evidence/ORLO_DOGFOOD.md](./docs/evidence/ORLO_DOGFOOD.md) | Evaluators, maintainers | Real-project dogfood notes and cost-estimate artifact |
| [docs/evidence/blinc/README.md](./docs/evidence/blinc/README.md) | Evaluators, maintainers | Public OSS portability benchmark with bootstrapped meaning |

---

## Repo Structure

```
semantic-authority/
├── README.md              ← You are here
├── MANIFESTO.md           ← Why
├── GUIDE.md               ← How to write MEANING.yaml
├── AGENTS.md              ← How agents consume it
├── PRD_MEANING_REVIEW.md  ← PRD + ERD for the review build
│
├── docs/
│   ├── MENTAL_MODEL.md              ← Diagram + per-role usage
│   ├── REVIEW.md                    ← `meaning review` usage guide
│   └── GENERATE_MEANING_PROMPT.md   ← LLM prompt for drafting from a BRD
│
├── packages/cli/          ← The `meaning` CLI (init, validate, context, review, drift)
├── action/                ← GitHub Action wrapper
└── examples/
    └── invoice-processor/ ← Worked example + seeded review scenarios
```

`MEANING.yaml` lives in your repo root and is committed. `.claude/meaning-context.md` is a generated artifact — add it to `.gitignore` and regenerate from `MEANING.yaml` anytime.

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

## Related Work

The deterministic / probabilistic boundary that separates `meaning validate` from `meaning review` is the trust-boundary thesis explored in:

> Aligba, S. (2026). *Formal Intermediate Representations as Safety Boundaries for LLM Agents in Financial Workflows.* Working paper, submitted to the Human × AI Finance Conference, UCLA Anderson School of Management & Fink Center for Finance & Investments, April 2026.

A public-facing essay introducing the same thesis — [The Sandwich Architecture](https://www.linkedin.com/pulse/sandwich-architecture-samson-aligba-5f6de) — makes the operational claim plainly: *formal intermediate representations are the trust boundary for agentic systems*. `MEANING.yaml` is the human-authored upstream layer; `meaning validate` and `meaning review` are the verification surfaces that catch when execution drifts from declared meaning before merge.

---

## License

MIT License — Copyright 2026 Samson Aligba

---

Maintained as part of the AI Native PM Stack.
