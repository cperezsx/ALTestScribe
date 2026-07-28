# Visual Studio Marketplace release checklist

## Before publishing

- [ ] Confirm the release version is `1.0.0` in `package.json`, `package-lock.json`, README badge, site copy, and CHANGELOG.
- [ ] Verify `publisher` is the Visual Studio Marketplace publisher you control (`cperezsx`).
- [ ] Run `npm ci` and `npm run check` locally.
- [ ] Install the generated VSIX in a clean VS Code profile and test it with an AL workspace.
- [ ] Verify automatic and manual export, each selected report format, status-bar confirmation, and output-folder history.
- [ ] Verify the version 1.0 guarantees: reports remain local, original AL calls run first, history is not overwritten, and no unselected format is created.
- [ ] Review README links, icon, license, support information, and screenshots/site copy.
- [ ] Ensure generated report files, `.alpackages`, credentials, and customer data are absent from Git.

## GitHub repository setup

- [ ] Protect `main` and require the **Lint and package** status check.
- [ ] Add repository secret `VSCE_PAT` with an Azure DevOps Marketplace personal access token that has **Marketplace Manage** scope.
- [ ] Enable GitHub Pages with **GitHub Actions** as its source.
- [ ] Verify that the `cperezsx` Marketplace publisher exists and that the extension identifier will be `cperezsx.al-test-scribe`.

## Publish

- [ ] Push the release commit and confirm CI is green.
- [ ] Run **Publish Marketplace** manually from the Actions tab, optionally entering the expected version.
- [ ] Enter `1.0.0` as the expected version for the first stable release.
- [ ] Confirm the Marketplace listing, extension icon, README rendering, commands, settings, and installation path.
- [ ] Create a GitHub release and attach the generated VSIX if you want a downloadable release artifact outside the Marketplace.
