# Publishing playbook-kit

Steps 1–4 happen once. After that, every release is step 5.

## 1. Fill in your details

Run in the project folder, replacing the placeholders:

```bash
npm pkg set author="Your Name"
npm pkg set repository.type=git repository.url="git+https://github.com/YOUR_USERNAME/playbook-kit.git"
npm pkg set homepage="https://github.com/YOUR_USERNAME/playbook-kit#readme" bugs.url="https://github.com/YOUR_USERNAME/playbook-kit/issues"
```

`repository.url` must match the GitHub repository exactly, or npm's trusted publishing will refuse the release.

## 2. Put it on GitHub

1. On github.com, create a new **public** repository named `playbook-kit`. Leave it empty (no README, license or .gitignore).
2. In the project folder:

```bash
git init -b main
git add .
git commit -m "playbook-kit 0.1.0"
git remote add origin https://github.com/YOUR_USERNAME/playbook-kit.git
git push -u origin main
```

3. Open the **Actions** tab and confirm the `ci` workflow passes.
4. Repository settings worth turning on: a short description and topics (`agent-skills`, `claude-code`, `copilot`, `chatgpt`, `prompts`), Issues, and branch protection on `main` requiring `ci`.

## 3. First npm release (by hand, registers the name)

```bash
npm login            # opens the browser; turn on two-factor authentication if asked
npm test             # must pass
npm pack --dry-run   # check the file list: dist, playbooks, skills, README, LICENSE
npm publish
```

Check it worked from an empty folder: `npx playbook-kit@latest init`.

Then tag the release so GitHub matches npm:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The `release` workflow will run for this tag and fail at the publish step, because trusted publishing isn't set up yet and 0.1.0 already exists. That is expected for this one tag only.

## 4. Switch to token-free releases

On npmjs.com: **playbook-kit → Settings → Trusted publisher → GitHub Actions**, and enter:

- Organization or user: `YOUR_USERNAME`
- Repository: `playbook-kit`
- Workflow filename: `release.yml`

From now on GitHub Actions publishes for you, with a provenance badge on npm showing exactly which commit was built. No npm token is stored anywhere. Optionally, in the same settings page, set publishing access to require trusted publishing, so nobody can publish from a laptop.

## 5. Every later release

1. Add the changes under a new heading in `CHANGELOG.md`.
2. Bump the version (this also commits and tags):

```bash
npm version patch    # 0.1.0 → 0.1.1 for fixes; use minor for new features, major for breaking changes
git push --follow-tags
```

3. The `release` workflow runs the tests, checks the tag matches `package.json`, and publishes.
4. On GitHub, create a Release from the tag and paste the changelog section.

## If something fails

| Symptom | Likely cause |
|---|---|
| `npm publish` says the name is taken | Someone registered it first. Pick a new name in `package.json` and README. |
| Release workflow: 404 or "not authorized" on publish | Trusted publisher fields don't match the repo, workflow file name, or `repository.url`. |
| "Tag matches package.json version" fails | You tagged by hand without bumping the version. Use `npm version`. |
| Provenance missing | The GitHub repository is private; provenance only works for public repositories. |
