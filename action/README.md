# Semantic Authority GitHub Action

This action wraps the `meaning` CLI so pull requests can validate `MEANING.yaml`, review diffs against declared constraints, and upload SARIF annotations.

## Usage

This repo includes the composite Action definition now. The Action builds the CLI directly from this repository, so external usage works today without waiting for npm publication.

```yaml
name: Meaning Gate

on:
  pull_request:

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
      - uses: ai-native-pm-stack/semantic-authority/action@main
        with:
          mode: both
          fail-on: block
          provider: anthropic
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

For repo-local development, use the default branch or a commit SHA:

```yaml
- uses: ai-native-pm-stack/semantic-authority/action@main
```

## Inputs

- `mode`: `validate`, `review`, or `both`. Default: `validate`
- `validate`: deprecated compatibility flag for schema validation
- `gate`: deprecated compatibility flag for review mode
- `strict`: treat validation warnings as errors. Default: `false`
- `meaning-file`: path to the `MEANING.yaml` file. Default: `./MEANING.yaml`
- `base`: base ref for review mode. Defaults to the PR base ref or `main`
- `fail-on`: severity threshold that exits non-zero in review mode. Default: `block`
- `provider`: `anthropic` or `openai`. Default: `anthropic`
- `model`: model id for the review judge
- `budget-usd`: per-run cost cap for review mode. Default: `1.00`
- `upload-sarif`: upload code-scanning annotations when review mode runs. Default: `true`
- `cache`: persist the review cache across workflow runs. Default: `true`

## What It Does

1. installs Node.js 20
2. runs `npm ci` and `npm run build` inside this repo's `packages/cli`
3. runs `meaning validate`
4. runs `meaning review` once, writes the text report into `GITHUB_STEP_SUMMARY`, and optionally emits SARIF from the same judgment
5. uploads SARIF so GitHub can render inline annotations and code-scanning alerts

## Cache behavior

The Action restores and saves `.meaning-cache/review` through `actions/cache`, keyed broadly enough to reuse prior branch results while still storing new cache entries for new commits. The CLI itself keys entries by:

- `diff_hash`
- `meaning_hash`
- `model_id`
- `provider`

That means repeated pushes that do not change the reviewed diff or `MEANING.yaml` can reuse the same judgment instead of repaying the model call.

## Provider setup

Anthropic:

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

OpenAI:

```yaml
with:
  provider: openai
  model: gpt-5.4-mini
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Roadmap

- publish `@semantic-authority/cli` to npm so local CLI usage becomes `npx @semantic-authority/cli ...`
- cut a `v0.2.0-alpha` release tag that matches the review/drift surface now living on `main`

## Smoke Test

The fastest smoke path is to:

1. push this repo to GitHub
2. add the workflow above to a sample repo that includes `MEANING.yaml`
3. open a pull request and confirm the action summary includes the review report and SARIF annotations appear on changed lines
