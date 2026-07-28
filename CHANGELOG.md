# Changelog

All notable changes to AL TestScribe are documented in this file.

## 1.0.0

First stable public release.

- Captures failures reported by the Microsoft AL Language test service after the original service call, without replacing AL notification handlers.
- Exports complete failure details as Markdown, JSON, CSV, or a user-selected combination of those formats.
- Supports automatic export after every captured failure and deliberate manual export from the Command Palette.
- Stores each run under a user and timestamp folder, preserving prior reports instead of overwriting them.
- Provides commands to export the current capture, open the latest available report, open the export folder, and discard a capture that has not been exported.
- Adds a native **AL TestScribe** section to the VS Code Testing sidebar. It shows the current capture, individual failure details, and the latest saved report.
- Ignores or completes duplicate AL failure notifications that have the same codeunit and error but omit the test name, preventing spurious `(Unknown test)` report entries.
- Localizes manifest text in English and Spanish, including commands, the Testing view, and all settings. Manual mode now visibly confirms that capture is waiting for an explicit export.
- Confirms successful automatic and manual writes in the status bar and records their destination in the AL TestScribe output channel.
- Keeps report data local to the opened workspace. The extension does not upload reports, collect telemetry, run tests, or perform automatic remediation.
