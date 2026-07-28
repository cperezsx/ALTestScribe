const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const AL_EXTENSION_ID = 'ms-dynamics-smb.al';
const DEFAULT_FORMATS = ['markdown', 'json', 'csv'];
const FORMAT_DETAILS = {
  markdown: { extension: 'md', fileName: 'al-test-failures.md' },
  json: { extension: 'json', fileName: 'al-test-failures.json' },
  csv: { extension: 'csv', fileName: 'al-test-failures.csv' }
};

let currentRun;
let writeQueue = Promise.resolve();
let lastExport;
let testScribeViewProvider;
let runDocumentProvider;

class TestScribeTreeItem extends vscode.TreeItem {
  constructor(label, options = {}) {
    super(label, options.collapsibleState ?? vscode.TreeItemCollapsibleState.None);
    Object.assign(this, options);
  }
}

class TestScribeFailuresProvider {
  constructor() {
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.changeEmitter.event;
  }

  refresh() {
    this.changeEmitter.fire();
  }

  dispose() {
    this.changeEmitter.dispose();
  }

  getTreeItem(item) {
    return item;
  }

  getChildren(item) {
    if (item?.children) {
      return item.children;
    }

    const items = [];
    if (currentRun) {
      items.push(this.createCurrentRunItem(currentRun));
    }

    const savedReport = findLatestSavedReport();
    if (savedReport) {
      items.push(new TestScribeTreeItem('Latest saved report', {
        description: savedReport.description,
        tooltip: savedReport.file,
        iconPath: new vscode.ThemeIcon('file'),
        contextValue: 'alTestScribeSavedReport',
        command: {
          command: 'vscode.open',
          title: 'Open latest saved report',
          arguments: [vscode.Uri.file(savedReport.file)]
        }
      }));
    }

    return items;
  }

  createCurrentRunItem(run) {
    const failureCount = run.failures.length;
    const runItem = new TestScribeTreeItem('Current test run', {
      description: `${failureCount} ${failureCount === 1 ? 'failure' : 'failures'}`,
      tooltip: `Started: ${new Date(run.startedAt).toLocaleString()}`,
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      iconPath: new vscode.ThemeIcon(failureCount ? 'error' : 'beaker'),
      contextValue: 'alTestScribeRun',
      command: {
        command: 'alTestScribe.openCurrentRunDetails',
        title: 'Open current run details'
      }
    });

    const settings = getSettings();
    runItem.children = [
      new TestScribeTreeItem('Started', {
        description: new Date(run.startedAt).toLocaleString(),
        iconPath: new vscode.ThemeIcon('calendar')
      }),
      new TestScribeTreeItem('Export mode', {
        description: settings.exportMode === 'automatic' ? 'Automatic' : 'Manual',
        iconPath: new vscode.ThemeIcon('settings-gear')
      }),
      new TestScribeTreeItem('Export status', {
        description: settings.exportMode === 'automatic'
          ? 'Exports after each captured failure'
          : 'Waiting for manual export',
        iconPath: new vscode.ThemeIcon(settings.exportMode === 'automatic' ? 'sync' : 'clock')
      })
    ];

    if (!failureCount) {
      runItem.children.push(new TestScribeTreeItem('No failed tests captured yet', {
        description: 'Run is waiting for failures',
        iconPath: new vscode.ThemeIcon('info')
      }));
    }

    run.failures.forEach((failure, index) => {
      const codeunit = failure.codeunitId === undefined || failure.codeunitId === null
        ? 'Unknown codeunit'
        : `Codeunit ${failure.codeunitId}`;
      const errorText = String(failure.error || '(No error message received)');
      runItem.children.push(new TestScribeTreeItem(failure.testName, {
        description: `${codeunit} · ${failure.durationMs || 0} ms`,
        tooltip: `${failure.testName}\n${codeunit}\nCaptured: ${new Date(failure.capturedAt).toLocaleString()}\n\n${errorText}`,
        iconPath: new vscode.ThemeIcon('error'),
        contextValue: 'alTestScribeFailure',
        failureIndex: index,
        command: {
          command: 'alTestScribe.openFailureDetails',
          title: 'Open failure details',
          arguments: [index]
        }
      }));
    });

    return runItem;
  }
}

class TestScribeRunDocumentProvider {
  constructor() {
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChange = this.changeEmitter.event;
  }

  refresh(previousFailureCount = 0) {
    this.changeEmitter.fire(vscode.Uri.parse('al-test-scribe:/current-run.md'));
    const failureCount = Math.max(currentRun?.failures.length || 0, previousFailureCount);
    for (let index = 0; index < failureCount; index += 1) {
      this.changeEmitter.fire(vscode.Uri.parse(`al-test-scribe:/failure/${index}.md`));
    }
  }

  dispose() {
    this.changeEmitter.dispose();
  }

  provideTextDocumentContent(uri) {
    if (!currentRun) {
      return '# AL TestScribe\n\nNo active test run has been captured.';
    }

    const failureMatch = uri.path.match(/^\/failure\/(\d+)\.md$/);
    if (failureMatch) {
      const failure = currentRun.failures[Number(failureMatch[1])];
      return failure ? buildFailureMarkdown(failure) : '# AL TestScribe\n\nThis failure is no longer available.';
    }

    return buildMarkdown(currentRun);
  }
}

function refreshTestScribeViews(previousFailureCount = 0) {
  testScribeViewProvider?.refresh();
  runDocumentProvider?.refresh(previousFailureCount);
}

function findWorkspaceRoot() {
  const folders = vscode.workspace.workspaceFolders || [];
  const alWorkspace = folders.find(folder =>
    fs.existsSync(path.join(folder.uri.fsPath, 'app.json'))
  );
  return (alWorkspace || folders[0])?.uri.fsPath;
}

function safeSegment(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

function timestampForPath(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('-');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSettings() {
  const configuration = vscode.workspace.getConfiguration('alTestScribe');
  const configuredFormats = configuration.get('formats', DEFAULT_FORMATS);
  const configuredExportMode = configuration.get('exportMode', 'automatic');
  const formats = Array.isArray(configuredFormats)
    ? configuredFormats.filter(format => FORMAT_DETAILS[format])
    : [];

  return {
    exportMode: configuredExportMode === 'manual' ? 'manual' : 'automatic',
    formats: formats.length ? formats : DEFAULT_FORMATS,
    outputDirectory: configuration.get('outputDirectory', 'tools/al-test-scribe-results'),
    userIdentifier: configuration.get('userIdentifier', '') || process.env.USERNAME || process.env.USER || 'unknown-user'
  };
}

function resolveOutputDirectory(root, outputDirectory) {
  const directory = path.resolve(root, outputDirectory || 'tools/al-test-scribe-results');
  const relative = path.relative(root, directory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('alTestScribe.outputDirectory must stay inside the opened workspace.');
  }
  return directory;
}

function getRunDirectory(root, settings, run) {
  return path.join(
    resolveOutputDirectory(root, settings.outputDirectory),
    safeSegment(settings.userIdentifier, 'unknown-user'),
    run.storageKey
  );
}

function startRun() {
  const previousFailureCount = currentRun?.failures.length || 0;
  const now = new Date();
  currentRun = {
    id: `${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    storageKey: `${timestampForPath(now)}-${String(now.getMilliseconds()).padStart(3, '0')}`,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    failures: []
  };
  refreshTestScribeViews(previousFailureCount);
  return currentRun;
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function indentedBlock(value) {
  return String(value || '(No error message received)')
    .split(/\r?\n/)
    .map(line => `    ${line}`)
    .join('\n');
}

function buildMarkdown(run) {
  const lines = [
    '# AL test failures',
    '',
    `- Run ID: ${run.id}`,
    `- Started: ${run.startedAt}`,
    `- Last updated: ${run.updatedAt}`,
    `- Failures captured: ${run.failures.length}`,
    ''
  ];

  if (run.failures.length === 0) {
    lines.push('No failed tests have been captured in this run.', '');
  }

  run.failures.forEach((failure, index) => {
    lines.push(
      `## ${index + 1}. ${failure.testName}`,
      '',
      `- Codeunit ID: ${failure.codeunitId ?? ''}`,
      `- Duration: ${failure.durationMs} ms`,
      `- Captured: ${failure.capturedAt}`,
      '',
      '### Error',
      '',
      indentedBlock(failure.error),
      ''
    );
  });

  return lines.join('\n');
}

function buildFailureMarkdown(failure) {
  return [
    `# ${failure.testName || '(Unknown test)'}`,
    '',
    `- Codeunit ID: ${failure.codeunitId ?? ''}`,
    `- Duration: ${failure.durationMs || 0} ms`,
    `- Captured: ${failure.capturedAt || ''}`,
    '',
    '## Error',
    '',
    '```text',
    String(failure.error || '(No error message received)'),
    '```',
    ''
  ].join('\n');
}

function buildCsv(run) {
  const rows = [
    ['Test', 'CodeunitId', 'DurationMs', 'CapturedAt', 'Error'].map(csvValue).join(','),
    ...run.failures.map(failure => [
      failure.testName,
      failure.codeunitId,
      failure.durationMs,
      failure.capturedAt,
      failure.error
    ].map(csvValue).join(','))
  ];
  return `${rows.join('\r\n')}\r\n`;
}

function normalizedFailureText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUnknownTestName(value) {
  return !value || value === '(Unknown test)';
}

function findEquivalentFailure(run, codeunitId, testName, error) {
  const normalizedError = normalizedFailureText(error);
  if (!normalizedError) {
    return undefined;
  }

  const now = Date.now();
  return run.failures.find(failure => {
    const capturedAt = Date.parse(failure.capturedAt);
    const isRecent = Number.isFinite(capturedAt) && now - capturedAt <= 5000;
    const sameCodeunit = String(failure.codeunitId ?? '') === String(codeunitId ?? '');
    const sameError = normalizedFailureText(failure.error) === normalizedError;
    const namesAreCompatible = isUnknownTestName(testName) ||
      isUnknownTestName(failure.testName) ||
      failure.testName === testName;
    return isRecent && sameCodeunit && sameError && namesAreCompatible;
  });
}

async function writeExport(run, root, settings) {
  const outputDirectory = getRunDirectory(root, settings, run);
  await fs.promises.mkdir(outputDirectory, { recursive: true });

  const writers = {
    markdown: () => fs.promises.writeFile(path.join(outputDirectory, FORMAT_DETAILS.markdown.fileName), buildMarkdown(run), 'utf8'),
    json: () => fs.promises.writeFile(path.join(outputDirectory, FORMAT_DETAILS.json.fileName), `${JSON.stringify(run, null, 2)}\n`, 'utf8'),
    csv: () => fs.promises.writeFile(path.join(outputDirectory, FORMAT_DETAILS.csv.fileName), buildCsv(run), 'utf8')
  };

  await Promise.all(settings.formats.map(format => writers[format]()));
  const files = settings.formats.map(format => path.join(outputDirectory, FORMAT_DETAILS[format].fileName));
  lastExport = { root, directory: outputDirectory, files };
  return lastExport;
}

function queueExport(run, root, settings, output) {
  const snapshot = clone(run);
  const work = async () => {
    const result = await writeExport(snapshot, root, settings);
    const formatList = settings.formats.map(format => FORMAT_DETAILS[format].extension.toUpperCase()).join(', ');
    const message = `AL TestScribe: exported ${snapshot.failures.length} failure(s) as ${formatList}.`;
    output.appendLine(`${message} Folder: ${result.directory}`);
    vscode.window.setStatusBarMessage(message, 7000);
    refreshTestScribeViews();
    return result;
  };
  writeQueue = writeQueue.then(work, work).catch(error => {
    output.appendLine(`Export failed: ${error.stack || error.message}`);
    throw error;
  });
  return writeQueue;
}

function captureFailure(codeunitId, testName, error, durationMs, output) {
  const run = currentRun || startRun();
  const resolvedTestName = testName || '(Unknown test)';
  const resolvedError = error || '(No error message received)';
  const equivalentFailure = findEquivalentFailure(run, codeunitId, resolvedTestName, resolvedError);

  if (equivalentFailure) {
    if (isUnknownTestName(equivalentFailure.testName) && !isUnknownTestName(resolvedTestName)) {
      equivalentFailure.testName = resolvedTestName;
      equivalentFailure.durationMs = durationMs || equivalentFailure.durationMs || 0;
      equivalentFailure.error = resolvedError;
      run.updatedAt = new Date().toISOString();
      output.appendLine(`Completed duplicate failure event with test name: ${resolvedTestName}`);
    } else {
      output.appendLine(`Ignored duplicate failure event: ${resolvedTestName}`);
      return;
    }
  } else {
    run.failures.push({
      testName: resolvedTestName,
      codeunitId,
      durationMs: durationMs || 0,
      capturedAt: new Date().toISOString(),
      error: resolvedError
    });
  }

  run.updatedAt = new Date().toISOString();

  const settings = getSettings();
  if (settings.exportMode === 'automatic') {
    const root = findWorkspaceRoot();
    if (!root) {
      output.appendLine('Skipped automatic export: no workspace is open.');
    } else {
      void queueExport(run, root, settings, output).catch(() => {});
    }
    output.appendLine(`Captured failure and queued automatic export: ${resolvedTestName}`);
    vscode.window.setStatusBarMessage(`AL TestScribe: captured ${resolvedTestName}; automatic export queued.`, 5000);
  } else {
    output.appendLine(`Captured failure pending manual export: ${resolvedTestName}`);
    vscode.window.setStatusBarMessage(`AL TestScribe: captured ${resolvedTestName}; waiting for manual export.`, 7000);
  }

  refreshTestScribeViews();
}

function findTestRunService(services) {
  return services.find(service =>
    typeof service?.initializeTestRun === 'function' &&
    typeof service?.onTestFailed === 'function' &&
    typeof service?.getTestController === 'function'
  );
}

function installSafeHooks(service, context, output) {
  const originalInitializeTestRun = service.initializeTestRun;
  const originalOnTestFailed = service.onTestFailed;

  function wrappedInitializeTestRun(...args) {
    const result = Reflect.apply(originalInitializeTestRun, this, args);
    try {
      startRun();
      output.appendLine('Started a new AL test capture.');
    } catch (error) {
      output.appendLine(`Could not initialize capture: ${error.stack || error.message}`);
    }
    return result;
  }

  function wrappedOnTestFailed(...args) {
    const result = Reflect.apply(originalOnTestFailed, this, args);
    try {
      captureFailure(args[0], args[1], args[2], args[3], output);
    } catch (error) {
      output.appendLine(`Could not capture failure: ${error.stack || error.message}`);
    }
    return result;
  }

  service.initializeTestRun = wrappedInitializeTestRun;
  service.onTestFailed = wrappedOnTestFailed;

  context.subscriptions.push({
    dispose() {
      if (service.initializeTestRun === wrappedInitializeTestRun) {
        service.initializeTestRun = originalInitializeTestRun;
      }
      if (service.onTestFailed === wrappedOnTestFailed) {
        service.onTestFailed = originalOnTestFailed;
      }
    }
  });
}

async function exportCurrentRun(output) {
  if (!currentRun) {
    vscode.window.showWarningMessage('AL TestScribe: no test run has been captured yet.');
    return;
  }

  const root = findWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('AL TestScribe: open a workspace before exporting.');
    return;
  }

  try {
    const result = await queueExport(currentRun, root, getSettings(), output);
    vscode.window.showInformationMessage(`AL TestScribe: exported ${currentRun.failures.length} failure(s) to ${result.directory}`);
  } catch (error) {
    vscode.window.showErrorMessage(`AL TestScribe: export failed. ${error.message}`);
  }
}

function latestFileFrom(directory) {
  for (const format of ['markdown', 'json', 'csv']) {
    const candidate = path.join(directory, FORMAT_DETAILS[format].fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
}

function findLatestExport(root, settings) {
  const userDirectory = path.join(
    resolveOutputDirectory(root, settings.outputDirectory),
    safeSegment(settings.userIdentifier, 'unknown-user')
  );
  if (!fs.existsSync(userDirectory)) {
    return undefined;
  }

  const runDirectories = fs.readdirSync(userDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .reverse();
  for (const directory of runDirectories) {
    const file = latestFileFrom(path.join(userDirectory, directory));
    if (file) {
      return file;
    }
  }
}

function findLatestSavedReport() {
  const root = findWorkspaceRoot();
  if (!root) {
    return undefined;
  }

  try {
    const file = lastExport?.root === root
      ? latestFileFrom(lastExport.directory)
      : findLatestExport(root, getSettings());
    return file ? { file, description: path.relative(root, file) } : undefined;
  } catch {
    return undefined;
  }
}

async function openCurrentRunDetails() {
  if (!currentRun) {
    vscode.window.showWarningMessage('AL TestScribe: no active test run has been captured yet.');
    return;
  }
  const document = await vscode.workspace.openTextDocument(vscode.Uri.parse('al-test-scribe:/current-run.md'));
  await vscode.window.showTextDocument(document, { preview: true });
}

async function openFailureDetails(itemOrIndex) {
  const index = typeof itemOrIndex === 'number' ? itemOrIndex : itemOrIndex?.failureIndex;
  const failure = currentRun?.failures?.[index];
  if (!failure) {
    vscode.window.showWarningMessage('AL TestScribe: this failure is no longer available in the current capture.');
    return;
  }
  const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(`al-test-scribe:/failure/${index}.md`));
  await vscode.window.showTextDocument(document, { preview: true });
}

async function openLatestExport() {
  const root = findWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('AL TestScribe: open a workspace first.');
    return;
  }

  const latestFile = lastExport?.root === root
    ? latestFileFrom(lastExport.directory)
    : findLatestExport(root, getSettings());
  if (!latestFile) {
    vscode.window.showWarningMessage('AL TestScribe: no exported test failures were found yet.');
    return;
  }

  const document = await vscode.workspace.openTextDocument(latestFile);
  await vscode.window.showTextDocument(document);
}

async function openExportFolder() {
  const root = findWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('AL TestScribe: open a workspace first.');
    return;
  }
  try {
    const directory = resolveOutputDirectory(root, getSettings().outputDirectory);
    await fs.promises.mkdir(directory, { recursive: true });
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(directory));
  } catch (error) {
    vscode.window.showErrorMessage(`AL TestScribe: could not open export folder. ${error.message}`);
  }
}

async function activate(context) {
  const output = vscode.window.createOutputChannel('AL TestScribe');
  context.subscriptions.push(output);
  testScribeViewProvider = new TestScribeFailuresProvider();
  runDocumentProvider = new TestScribeRunDocumentProvider();
  context.subscriptions.push(
    testScribeViewProvider,
    runDocumentProvider,
    vscode.window.createTreeView('alTestScribe.failures', {
      treeDataProvider: testScribeViewProvider,
      showCollapseAll: true
    }),
    vscode.workspace.registerTextDocumentContentProvider('al-test-scribe', runDocumentProvider),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('alTestScribe')) {
        if (event.affectsConfiguration('alTestScribe.exportMode')) {
          const mode = getSettings().exportMode;
          const message = `AL TestScribe: export mode changed to ${mode}.`;
          output.appendLine(message);
          vscode.window.setStatusBarMessage(message, 6000);
        }
        refreshTestScribeViews();
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('alTestScribe.exportCurrentRun', () => exportCurrentRun(output)),
    vscode.commands.registerCommand('alTestScribe.openLatestExport', openLatestExport),
    vscode.commands.registerCommand('alTestScribe.openExportFolder', openExportFolder),
    vscode.commands.registerCommand('alTestScribe.openCurrentRunDetails', openCurrentRunDetails),
    vscode.commands.registerCommand('alTestScribe.openFailureDetails', openFailureDetails),
    vscode.commands.registerCommand('alTestScribe.refreshFailuresView', refreshTestScribeViews),
    vscode.commands.registerCommand('alTestScribe.discardCurrentRun', () => {
      const previousFailureCount = currentRun?.failures.length || 0;
      currentRun = undefined;
      vscode.window.setStatusBarMessage('AL TestScribe: current test capture discarded.', 4000);
      output.appendLine('Current test capture discarded by user.');
      refreshTestScribeViews(previousFailureCount);
    })
  );

  try {
    const alExtension = vscode.extensions.getExtension(AL_EXTENSION_ID);
    if (!alExtension) {
      throw new Error(`The required extension ${AL_EXTENSION_ID} is not installed.`);
    }

    const alExports = await alExtension.activate();
    const services = alExports?.getServices?.() || [];
    const testRunService = findTestRunService(services);
    if (!testRunService) {
      throw new Error('The AL test service was not found in this AL extension version.');
    }

    installSafeHooks(testRunService, context, output);
    output.appendLine('AL TestScribe active. AL notification handlers were not replaced.');
  } catch (error) {
    output.appendLine(`Activation failed: ${error.stack || error.message}`);
    vscode.window.showErrorMessage(`AL TestScribe: ${error.message}`);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
