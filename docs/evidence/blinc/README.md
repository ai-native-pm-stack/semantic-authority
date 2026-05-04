# Blinc Portability Benchmark

This directory contains a **ported meaning benchmark** for the public
repository [`project-blinc/Blinc`](https://github.com/project-blinc/Blinc).

Unlike Orlo, Blinc did not originally ship with a `MEANING.yaml`. The artifact
here was bootstrapped from public repository materials so the `meaning review`
/ `meaning drift` workflow can be evaluated against a codebase that did not
start AI-native.

## Sources Used To Bootstrap Meaning

- root `README.md`
- `ROADMAP.md`
- `docs/web.md`
- `docs/book/src/introduction.md`
- `docs/book/src/getting-started/installation.md`
- `Skills.md`
- root `Cargo.toml`
- `.github/workflows/ci.yml`

Canonical artifact:

- [MEANING.yaml](./MEANING.yaml)

## Benchmark Configuration

The current live benchmark is a cold, no-cache OpenAI run over 10 recent
**reviewable** Blinc commit diffs:

- provider: `openai`
- model: `gpt-5.4-mini`
- mode: `live`
- cache: disabled (`--no-cache`)
- requested sample count: `10`
- scanned commits: `200`
- skipped non-reviewable commits: `2`

Artifacts:

- [blinc-dogfood-live.json](./blinc-dogfood-live.json)
- [blinc-dogfood-estimate.json](./blinc-dogfood-estimate.json)

## Live Benchmark Summary

- successful runs: `10 / 10`
- average files changed: `1.8`
- average changed lines: `124.5`
- average latency: `2.95s`
- p95 latency: `3.57s`
- average cost per run: `$0.0041`
- p95 cost per run: `$0.0097`
- total at-risk findings: `0`
- total `insufficient_context` verdicts: `0`

On this sample, the OpenAI path is comfortably inside the current PRD latency
and cost targets (`M3`, `M4`).

## What This Benchmark Proves

- The review pipeline transfers to a public repo that did not originate with
  `MEANING.yaml`.
- A bootstrapped meaning artifact can support successful live review runs on a
  non-toy Rust workspace.
- The dry-run estimator is calibrated closely enough to be a practical product
  surface. Live average cost (`$0.0041`) is about `4%` below estimate
  (`$0.00425`), and live p95 cost (`$0.0097`) is about `2%` below estimate
  (`$0.0099`).

## What This Benchmark Does Not Prove

- Governance legitimacy. This is a reconstructed artifact, not one owned by
  the Blinc maintainers.
- Precision. There were no at-risk findings in this dataset, so precision is
  undefined here.
- Recall. This sample is not hand-labeled for seeded violations, so miss rate
  cannot be measured yet.
- Judge calibration on borderline constraints. `0` `insufficient_context`
  verdicts here means the bootstrapped meaning artifact was specific enough for
  these diffs, not that the judge is fully validated.

## Scale Endpoints Worth Noticing

- **Lower bound (`sample_06`)**: `1` file, `15` changed lines, `2.47s`,
  `$0.0022`.
- **Worst case (`sample_10`)**: `5` files, `615` changed lines, `3.07s`,
  `$0.0097`.

That is the portability story in one line: even the largest diff in this
sample stayed under a cent and just over three seconds.

## Repository Review Observations

While bootstrapping the meaning artifact, two doc-parity issues stood out:

- `docs/book/src/getting-started/installation.md` still says `Rust 1.70+` and
  shows `blinc_app = { version = "0.1" ... }`, while the workspace
  `Cargo.toml` currently declares `rust-version = "1.75"` and `version = "0.5.1"`.
- The root `README.md` and `docs/web.md` disagree on current Firefox / Safari
  web support.

These findings came from manual repository review, not from the live benchmark
sample itself. They are included here because they illustrate the kind of
scope and parity constraints that a native, maintainer-owned `MEANING.yaml`
could make easier to review over time.

## How To Reproduce

Estimate mode:

```bash
node scripts/dogfood-eval.mjs \
  --project Blinc \
  --repo /path/to/blinc \
  --meaning docs/evidence/blinc/MEANING.yaml \
  --count 10 \
  --mode estimate \
  --public \
  --model gpt-5.4-mini \
  --output docs/evidence/blinc/blinc-dogfood-estimate.json
```

Live mode:

```bash
set -a
source .env
set +a

node scripts/dogfood-eval.mjs \
  --project Blinc \
  --repo /path/to/blinc \
  --meaning docs/evidence/blinc/MEANING.yaml \
  --count 10 \
  --mode live \
  --provider openai \
  --public \
  --no-cache \
  --model gpt-5.4-mini \
  --output docs/evidence/blinc/blinc-dogfood-live.json
```
