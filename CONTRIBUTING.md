# Contributing to playbook-kit

Thanks for helping. The project stays useful to everyone only if it stays small, neutral and easy to extend.

## Principles

1. **No runtime.** Everything works offline: no server, network call or API key.
2. **Deterministic.** The same playbook and request always give the same result.
3. **Vendor-neutral.** No assistant gets special treatment. Tool-specific code lives only in `src/compile.ts`.
4. **Zero runtime dependencies.**
5. **Compile to native formats.** Prefer the open Agent Skills format; add tool-specific output only when a tool can't read skills.

## Contribute a playbook (no code needed)

1. `npx playbook-kit new my-task` and fill it in (or ask your assistant using `skills/playbook-author`).
2. Add 2-4 real requests under `## Examples` and at least one under `## Not for`.
3. Run `npx playbook-kit check --dir playbooks` and `npx playbook-kit test --dir playbooks`.
4. Open a pull request saying who the playbook is for and where you've used it.

Good playbooks ask few questions, have checkable "Done when" items, and reflect how a real team works rather than generic advice.

## Add or fix a target

Targets live in `TARGETS` in `src/compile.ts`. Include a link to the tool's documentation for the folder or file format in your pull request, since these change often.

## Code changes

```bash
npm install
npm test                       # builds, then runs node:test
node dist/cli.js test          # routing tests on the starter playbooks
```

- Add a test for every behaviour change.
- Changes to matching: include `playbook test` output before and after.
- Keep the public API in `src/index.ts` backwards compatible within a major version.
