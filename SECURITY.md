# Security Policy

Semantic Authority is mostly documentation and CLI tooling, but security issues still matter.

## Please Report Privately

Do not open a public issue for vulnerabilities that could expose users, repositories, secrets, or workflow execution.

If GitHub private vulnerability reporting is enabled for this repo, use that path first. Otherwise contact the maintainers through the repository owners and avoid public disclosure until triage is complete.

## Good Reports Include

- affected file or surface
- reproduction steps
- impact
- suggested mitigation, if known

## Scope

Relevant reports include:

- command injection or unsafe shell execution
- workflow/action misuse
- unsafe file writes or path handling
- secrets exposure in generated artifacts or docs
