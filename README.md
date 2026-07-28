# AL TestScribe

> Durable, local evidence for failed Microsoft Dynamics 365 Business Central AL tests.

[![Version](https://img.shields.io/badge/version-1.0.0-38bdf8)](CHANGELOG.md)
[![VS%20Code](https://img.shields.io/badge/VS%20Code-%5E1.90-60a5fa)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-f97316)](LICENSE)
[![Data](https://img.shields.io/badge/test%20data-local%20only-22c55e)](#privacy)

AL TestScribe observes failed AL tests in VS Code and preserves their complete failure details as files in the current workspace. It does not run tests, upload reports, analyse them with AI, or decide what happens next. You keep the evidence and choose how to use it.

**Website:** [cperezsx.github.io/ALTestScribe](https://cperezsx.github.io/ALTestScribe/) · **Issues:** [github.com/cperezsx/ALTestScribe/issues](https://github.com/cperezsx/ALTestScribe/issues)

## Why AL TestScribe

Test notifications are useful while they are visible, but a failure needs a durable hand-off when it is time to investigate, document, share, or automate a next step. AL TestScribe turns that short-lived notification into a local report without changing the AL test workflow.

Version 1.0 makes five commitments:

- **Local by design:** report data stays inside the opened workspace. No telemetry or report uploads.
- **Respectful integration:** the original AL test-service method runs before TestScribe records a failure.
- **No overwritten history:** every run receives a user- and timestamp-specific folder.
- **User-controlled export:** select automatic export or wait for a manual export command.
- **Portable reports:** write Markdown, JSON, CSV, or any combination of those formats.

## What is captured

Each failed test record contains:

| Field | Meaning |
| --- | --- |
| Test | Failed AL test method. |
| Codeunit ID | Owning codeunit when the AL service provides it. |
| Duration | Reported duration in milliseconds. |
| Captured at | ISO timestamp for the notification. |
| Error | Complete error text and call stack received from AL. |

Some AL Language versions send an immediate second failure notification without a test name. Equivalent notifications are merged in a short window, so the same failure is retained once instead of becoming an `(Unknown test)` duplicate. Failures from different named test methods are always kept separately.

## Requirements

- Visual Studio Code `^1.90.0`.
- The [AL Language](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) extension.
- An open AL workspace. In a multi-root workspace, AL TestScribe uses the folder containing `app.json` when available.

AL TestScribe is intentionally AL-specific. It is not a test runner or a generic reporter for Jest, Playwright, .NET, Python, or other test technologies.

## Quick start

1. Install **AL Language** and **AL TestScribe**.
2. Open an AL workspace containing `app.json`.
3. Run AL tests as usual.
4. When a test fails, AL TestScribe captures it and, by default, exports a report.
5. Open the **Testing** sidebar to inspect the captured failures, or run **AL TestScribe: Open Latest Export** from the Command Palette.

## Testing sidebar

The native **AL TestScribe** section appears in VS Code's **Testing** sidebar. It complements the AL test UI; it does not replace it.

| Item | What it gives you |
| --- | --- |
| Current test run | Start time, active export mode, export state, and captured failure count. |
| Individual failure | Test name, codeunit, duration, hoverable error text, and a click-through read-only detail document. |
| Latest saved report | A direct link to the newest saved report, including after a VS Code restart. |
| View actions | Refresh the data or export the current capture. |

The view refreshes when a run starts, a failure is captured, an export completes, a capture is discarded, or an AL TestScribe setting changes.

## Export modes

| Mode | Behaviour | When to use it |
| --- | --- | --- |
| `automatic` (default) | Queues an updated report after every captured failure. VS Code confirms the write in the status bar and Output channel. | You want a report as tests run. |
| `manual` | Retains failures in memory and writes nothing until **AL TestScribe: Export Current Test Failures** is invoked. | You want to decide when a capture becomes a file. |

The Testing sidebar makes the active choice explicit. Automatic mode says that it exports after each captured failure. Manual mode says **Waiting for manual export**, and the status bar confirms that no file has been written yet.

> A manual capture only exists in the active VS Code session until it is exported. Closing VS Code before exporting discards that in-memory capture.

## Report history and formats

Every test run gets its own directory, so a later run cannot replace earlier evidence:

```text
tools/al-test-scribe-results/
  carlos/
    2026-07-28_14-35-42-123/
      al-test-failures.md
      al-test-failures.json
      al-test-failures.csv
```

Select only the formats you need:

| Format | Best for |
| --- | --- |
| Markdown | Human review, notes, pull-request context, and sharing. |
| JSON | Scripts and structured tooling. |
| CSV | Spreadsheets and tabular review. |

## Commands

Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P`.

| Command | Purpose |
| --- | --- |
| `AL TestScribe: Export Current Test Failures` | Writes the current in-memory capture in the configured formats. |
| `AL TestScribe: Open Latest Export` | Opens the latest Markdown report, falling back to JSON or CSV when Markdown was not selected. |
| `AL TestScribe: Open Export Folder` | Opens the workspace directory containing saved report history. |
| `AL TestScribe: Discard Current Test Capture` | Clears the current in-memory capture without deleting any saved report. |
| `AL TestScribe: Open Current Run Details` | Opens all currently captured failures in a read-only document. |
| `AL TestScribe: Refresh Test Failures View` | Refreshes the AL TestScribe view in the Testing sidebar. |

VS Code translates command and setting labels to English or Spanish according to its display language.

## Settings

Search for **AL TestScribe** in VS Code Settings, or add these workspace settings:

```json
{
  "alTestScribe.exportMode": "manual",
  "alTestScribe.formats": ["markdown", "json"],
  "alTestScribe.outputDirectory": "artifacts/al-test-failures",
  "alTestScribe.userIdentifier": "carlos"
}
```

| Setting | Default | Description |
| --- | --- | --- |
| `alTestScribe.exportMode` | `automatic` | Writes after every captured failure or waits for an explicit manual export. |
| `alTestScribe.formats` | `markdown`, `json`, `csv` | One or more formats to create for each exported run. |
| `alTestScribe.outputDirectory` | `tools/al-test-scribe-results` | Report directory relative to the workspace. Paths outside the workspace are rejected. |
| `alTestScribe.userIdentifier` | Operating-system user | Folder name used to separate one user's report history from another's. |

## Privacy and boundaries

AL TestScribe writes selected report formats only to the opened workspace. It does not send source code, errors, credentials, workspace data, or telemetry to a network service.

The extension depends on the test-run service exposed by the installed AL Language extension. If a future AL Language release changes that internal service shape, activation can fail; diagnostic details are written to the **AL TestScribe** Output channel.

Out of scope for version 1.0:

- Running or scheduling tests.
- Replacing AL test UI or notification handlers.
- Diagnosing, fixing, prioritising, uploading, or deleting reports.
- Supporting non-AL test technologies.

## Development

```powershell
npm ci
npm run check
```

`npm run check` validates the extension and creates `al-test-scribe-1.0.0.vsix`. Install the package locally with **Extensions: Install from VSIX...** in VS Code.

Before a release, use the [Marketplace checklist](docs/internal/MARKETPLACE_CHECKLIST.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules, [SUPPORT.md](SUPPORT.md) for support guidance, and [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

MIT. See [LICENSE](LICENSE).

## Creators

Created by [Carlos Perez (@cperezsx)](https://github.com/cperezsx) and [Jose Miguel Dura Sirvent (@jmdura)](https://github.com/jmdura).
