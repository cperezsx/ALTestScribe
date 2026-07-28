# Repository guidance

## Product boundary

AL TestScribe captures and exports AL test failures. Keep it local-first and neutral about what users do with exported files. Do not add AI analysis, external uploads, telemetry, test execution, or report deletion without an explicit product decision.

## Version 1.0 invariants

The first stable release guarantees local-only data handling, original AL service calls before capture, timestamped history without overwrites, and user-controlled manual or automatic export. Treat a change to any of these as a breaking product decision and update the README, CHANGELOG, release notes, and version accordingly.

## AL integration safety

- Call original AL test-service methods before any capture work.
- Do not replace AL notification handlers.
- Keep activation failures informative in the `AL TestScribe` output channel.
- Treat the AL extension service shape as version-sensitive. Document any compatibility constraint.

## Exports

- Keep all output paths inside the opened workspace.
- Preserve timestamped report history. Never restore a `latest` file that overwrites prior runs.
- Keep Markdown, JSON, and CSV output semantically aligned when changing report fields.
- Do not commit generated reports or VSIX packages.

## Quality gate

Run `npm run check` before handing off code. Update README, CHANGELOG, and Marketplace documentation for any user-visible change.
