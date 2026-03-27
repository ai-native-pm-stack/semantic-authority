# Semantic Authority Pitch Deck

## Slide 1 — Title

**Semantic Authority**

Make system meaning explicit, machine-legible, and enforceable.

Subhead:
Your AI agents are shipping fast. But are they shipping right?

## Slide 2 — The Operational Failure

Tell the concrete story:

- AI-assisted velocity is high
- a plausible PR bypasses an unstated business constraint
- tests pass because the rule never existed in code
- the incident is semantic, not syntactic

Core message:
Silence is interpreted as permission.

## Slide 3 — Who Feels the Pain

- CTO / VP Engineering: incidents, rework, trust erosion
- CPO / VP Product: scope drift, roadmap dilution
- Engineering Managers: coordination tax and late discovery

Core message:
This is not just an engineering problem. It is an operating-model problem.

## Slide 4 — The Root Cause

Today the rules live in places agents cannot reliably govern:

- PRDs
- Confluence
- Slack threads
- tribal memory

Core message:
The rules are not wrong. They are invisible.

## Slide 5 — The Product

Introduce `MEANING.yaml`:

- goal
- success criteria
- non-goals
- constraints with IDs and owners
- trade-offs
- drift policy

Core message:
Semantic Authority turns intent into a machine-consumable artifact.

## Slide 6 — Enforcement Model

Three levels:

- `block`
- `warn`
- `observe`

Core message:
Teams can adopt governance gradually without stopping delivery on day one.

## Slide 7 — How It Works

1. Humans author or refine `MEANING.yaml`
2. `meaning validate` checks structure and semantic hygiene
3. `meaning context` generates `.claude/meaning-context.md`
4. agents consume the context before they act
5. the GitHub Action enforces the boundary in CI

Core message:
The product fits current workflows instead of demanding a new platform.

## Slide 8 — What Changes for Teams

- PMs make non-goals operational
- architects give constraints IDs and owners
- engineers work with explicit validity boundaries
- AI agents receive governed context instead of vague prose

Core message:
Semantic Authority becomes the trust boundary for AI-assisted execution.

## Slide 9 — Why Now

- AI has made execution cheap
- the limiting factor is now shared understanding
- prompt quality alone does not create enforceable validity

Core message:
Teams need a semantic control plane before they need more agent speed.

## Slide 10 — Position in the Stack

Semantic Authority is the meaning layer:

- tests enforce behavior
- prompts influence execution
- Semantic Authority defines validity

Core message:
This is complementary infrastructure, not a replacement for tests or specs.

## Slide 11 — Close

Closing line:

Formal intent should live in the repo, not in memory.

Call to action:

- review the example `MEANING.yaml`
- run the CLI
- add the GitHub Action
- make system meaning enforceable before agent velocity outruns governance
