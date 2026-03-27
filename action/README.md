# Semantic Authority GitHub Action

This action wraps the `meaning` CLI so pull requests can validate `MEANING.yaml` and publish a drift report in the workflow summary.

## Usage

After the repo has a stable release tag, reference that tag:

```yaml
name: Meaning Gate

on:
  pull_request:

jobs:
  meaning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ai-native-pm-stack/semantic-authority/action@v1
        with:
          validate: true
          gate: true
```

Before the first tagged release, use the default branch or a commit SHA instead:

```yaml
- uses: ai-native-pm-stack/semantic-authority/action@main
```

## Inputs

- `validate`: run schema and semantic validation. Default: `true`
- `gate`: append the validation output to the workflow summary. Default: `false`
- `strict`: treat warnings as errors. Default: `false`
- `meaning-file`: path to the `MEANING.yaml` file. Default: `./MEANING.yaml`

## What It Does

1. installs Node.js 20
2. installs `@semantic-authority/cli`
3. runs `meaning validate`
4. optionally writes a PR-friendly report into `GITHUB_STEP_SUMMARY`

## Smoke Test

The fastest validation path is to:

1. push this repo to GitHub
2. add the workflow above to a sample repo that includes `MEANING.yaml`
3. open a pull request and confirm the action summary includes the validation report
