# AL TestScribe 1.0 release definition

## Release intent

Version 1.0 is the first stable public release of AL TestScribe. It establishes a deliberately narrow contract: observe AL test failures, preserve their details as local files, and leave all subsequent decisions to the user.

## Stable behavior

| Area | 1.0 commitment |
| --- | --- |
| Integration | Original AL test-service methods execute before TestScribe records the failure. |
| Data location | Reports are written only inside the opened workspace. |
| Retention | Every run receives a user- and timestamp-specific directory. Prior runs are not overwritten. |
| Export control | Automatic export writes after a captured failure. Manual export writes only when the user invokes the command. |
| Report formats | Markdown, JSON, and CSV are independently selectable. |
| Feedback | A successful write is confirmed in the status bar and output channel. |
| Testing sidebar | The native AL TestScribe view shows the current capture and the latest saved report without replacing the AL test UI. |
| Privacy | No telemetry, automatic upload, AI analysis, or cloud synchronization is performed. |

## Explicit non-goals

- Running or scheduling AL tests.
- Replacing Microsoft AL test UI or notification handlers.
- Diagnosing, fixing, or prioritizing failures.
- Supporting test technologies other than Microsoft Dynamics 365 Business Central AL.
- Deleting, rotating, or uploading user reports automatically.

## Release acceptance

Before publishing 1.0.0, test these scenarios in an Extension Development Host against a real AL workspace:

1. A failed AL test is captured while the original AL test UI continues to update.
2. Automatic mode writes only the selected formats and displays a confirmation.
3. Manual mode writes nothing until **AL TestScribe: Export Current Test Failures** is run.
4. Two consecutive test runs create distinct timestamp folders.
5. **Open Latest Export**, **Open Export Folder**, and **Discard Current Test Capture** behave as documented.
6. The Testing sidebar shows the current failures, opens a selected failure's details, and refreshes after capture or export.
7. The generated `al-test-scribe-1.0.0.vsix` installs successfully in a clean VS Code profile with AL Language installed.
