# Orlo Dogfood

This page tracks one real-world dogfood target for the `meaning review` /
`meaning drift` surface: Orlo and its `MEANING.yaml`.

Because Orlo's codebase is private, the committed artifacts on this page are
**public-safe exports**:

- sample IDs instead of commit SHAs
- no local filesystem paths
- no private repository URLs

## Live Benchmark

The current primary artifact is a **cold live run** over the 10 most recent
Orlo commit diffs using:

- provider: `openai`
- model: `gpt-5.4-mini`
- mode: `live`
- cache: disabled (`--no-cache`)
- meaning file: `docs/MEANING.yaml`

Output artifact:

- [orlo-dogfood-live.json](./orlo-dogfood-live.json)

Summary:

- samples: `10`
- successful runs: `10 / 10`
- average files changed: `8.0`
- average changed lines: `1035.1`
- average latency: `11.3s`
- p95 latency: `17.6s`
- average cost per run: `$0.0240`
- p95 cost per run: `$0.0806`
- total at-risk findings: `0`
- total `insufficient_context` verdicts: `111`

On this sample, the current OpenAI path is within the PRD latency and cost
targets. The dominant output was `insufficient_context`, not `at_risk`
findings. That means the current Orlo meaning artifact contains many
constraints that are still useful for human governance but are not yet
specific enough for reliable code-level review.

## Supplementary Estimate

This page also keeps the earlier **dry-run budget estimate** as a companion
artifact:

- [orlo-dogfood-estimate.json](./orlo-dogfood-estimate.json)

Estimate summary:

- average reviewed constraints: `26`
- average estimated input tokens: `15,776.1`
- average estimated cost per run: `$0.0209`
- p95 estimated cost per run: `$0.0931`

## What This Benchmark Does Not Yet Show

- labeled precision / recall
- a published SARIF screenshot from a real PR
- a hand-graded truth table for findings

## How To Reproduce

Estimate mode:

```bash
node scripts/dogfood-eval.mjs \
  --project Orlo \
  --repo /path/to/orlo \
  --meaning /path/to/orlo/docs/MEANING.yaml \
  --count 10 \
  --mode estimate \
  --public \
  --model gpt-5.4-mini \
  --output docs/evidence/orlo-dogfood-estimate.json
```

Live mode:

```bash
set -a
source .env
set +a

node scripts/dogfood-eval.mjs \
  --project Orlo \
  --repo /path/to/orlo \
  --meaning /path/to/orlo/docs/MEANING.yaml \
  --count 10 \
  --mode live \
  --provider openai \
  --public \
  --no-cache \
  --model gpt-5.4-mini \
  --output docs/evidence/orlo-dogfood-live.json
```
