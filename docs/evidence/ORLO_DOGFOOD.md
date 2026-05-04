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

## What This Benchmark Proves

- The pipeline runs end-to-end on a real codebase with real diff shapes.
  That is the concrete `M3` / `M4` evidence from the PRD: reliability,
  latency, and cost are inside target on non-toy inputs.
- The estimator is calibrated in the safe direction. Live average cost
  (`$0.0240`) is about `15%` above estimate (`$0.0209`), while live p95
  cost (`$0.0806`) stays below estimated p95 (`$0.0931`). Teams can use
  `--mode estimate` as a practical budgeting surface without paying for a
  live run first.
- `insufficient_context` is a real product primitive. The judge does not
  fabricate risk findings when the constraint cannot be evaluated cleanly
  against the diff; it says so explicitly.

## What This Benchmark Does Not Prove

- Precision. There were no `at_risk` findings in this dataset, so precision
  is undefined here.
- Recall. This sample is not hand-labeled for seeded violations, so miss rate
  cannot be measured yet.
- Calibration of `insufficient_context`. Some of the `111` verdicts may be
  correctly humble and some may be missed risks; without a labeled review set,
  we cannot separate the two.

## Supplementary Estimate

This page also keeps the earlier **dry-run budget estimate** as a companion
artifact:

- [orlo-dogfood-estimate.json](./orlo-dogfood-estimate.json)

Estimate summary:

- average reviewed constraints: `26`
- average estimated input tokens: `15,776.1`
- average estimated cost per run: `$0.0209`
- p95 estimated cost per run: `$0.0931`

## Scale Endpoints Worth Noticing

- **Lower bound (`sample_06`)**: `1` file, `4` changed lines, `7.5s`,
  `$0.0079`, `0` `insufficient_context` verdicts. This is the focused-diff
  case where the judge had enough context to evaluate cleanly and cheaply.
- **Worst case (`sample_10`)**: `48` files, `9,072` changed lines, `17.6s`,
  `$0.0806`, `13` `insufficient_context` verdicts. This is the near-refactor
  case, and it still stayed inside the current PRD latency and cost targets.

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
