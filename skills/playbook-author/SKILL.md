---
name: playbook-author
description: Helps write or improve a team playbook (a Markdown file in a playbooks folder) by interviewing the person about how a recurring task should be done. Use when someone asks to create, write, edit or improve a playbook, or to turn "how we do X" into something every AI assistant follows. Do not use for running an existing playbook.
---

# Write a team playbook

A playbook captures how a recurring task should be done (questions to ask, skills to use, steps, output, checks) so every assistant does it the same way. Your job is to turn the person's know-how into one playbook file.

## 1. Interview, briefly

Ask these in one message, skipping anything already clear:

- Which task is this, and how do people usually ask for it? (Get 2-4 real example requests.)
- What do you always need to know before starting? (These become questions.)
- What does a good result look like: format, length, structure?
- What are the checks a reviewer would apply before accepting it?
- Which similar requests should *not* use this playbook?

## 2. Write the file

Save it as `playbooks/<name>.md`, where `<name>` is lowercase-with-hyphens. Use exactly this structure:

```markdown
---
name: <name>
title: <Human title>
description: <What it produces>. Use when someone asks for <situations>.
version: 0.1.0
owner: <team or person>
depth: quick | standard | thorough
triggers: [phrase one, phrase two]
---

## Ask first
- <id>: <Question>? [Option A | Option B] (skip if: words, that, already, answer, it)
- <id>: <Less important question>? (optional)

## Skills
- <skill-name> or <fallback-skill>: <what it is used for> (optional)

## Steps
1. ...

## Output
...

## Done when
- <checkable item>

## Examples
- <real request>

## Not for
- <similar request that belongs elsewhere>
```

Rules of thumb:

- At most four required questions. Add `(skip if: ...)` words so people who already said it aren't asked again.
- `depth`: `quick` for small tasks (at most one question), `thorough` when the agent should confirm a plan first.
- Only list skills that are actually installed, or mark them `(optional)`. Add alternatives with `or`.
- Done-when items must be checkable by reading the result, not vague ("high quality").
- Any extra `## Section` (style rules, glossary, templates) is passed to the agent as-is.

## 3. Verify

If the `playbook` command is available (`npx playbook-kit`), run `playbook check` and `playbook test` and fix what they report. Then show the person the file and offer to install it with `playbook install claude,agents` or build shareable files with `playbook build`.
