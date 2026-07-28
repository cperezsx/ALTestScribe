# Contributing

Thanks for helping improve AL TestScribe.

## Setup

```powershell
npm ci
npm run check
```

Open this repository in VS Code and press `F5` to start an Extension Development Host. Use an AL workspace with the AL Language extension installed to exercise the integration.

## Scope and design rules

- Keep AL TestScribe focused on capturing and exporting AL test failures. It must not decide what users do with the resulting reports.
- Preserve the version 1.0 guarantees described in the README: local-only reports, durable history, original AL service first, and user-controlled export.
- Preserve the original AL service call before capturing data. Do not replace AL notification handlers.
- Keep exports local to the workspace and reject output paths that escape it.
- Changes to report structure must remain clearly documented in the README and CHANGELOG.
- Do not add telemetry, network calls, or automatic publication of test data without an explicit, reviewed product decision.

## Pull requests

- Branch from `develop` when it exists; `main` is release-oriented.
- Keep each pull request focused and explain user-visible behavior in its description.
- Run `npm run check` before opening the pull request.
- Update tests when testable code is added, and update documentation when commands, settings, formats, or report paths change.
- Never include customer data, access tokens, `.alpackages`, generated test reports, or VSIX packages in a commit.
