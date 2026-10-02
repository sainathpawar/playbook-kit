# playbook-kit

**Write a team playbook once. Run it in every AI assistant.**

Everyone on your team uses AI differently, so results vary: someone forgets to say who the report is for, someone else gets a deck with no clear ask, a third gets a different format every week. Experienced users write good prompts; most people don't, and they shouldn't have to.

A **playbook** is a short Markdown file that captures how your team does a recurring task: what to ask first, which skills to use, the steps, the output format and the checks before it's done. `playbook-kit` compiles it into the native format of each assistant, so everyone gets the same quality whichever tool they use.

| Assistant | What you get |
|---|---|
| Claude Code | Skill in `.claude/skills/` (picked automatically or `/name`) |
| Codex, GitHub Copilot and other `.agents/skills` readers | Skill in `.agents/skills/` |
| GitHub Copilot (VS Code, Visual Studio, CLI) | Skill in `.github/skills/`, or a `/name` prompt file |
| Cursor, Gemini CLI | Skill in `.cursor/skills/`, `.gemini/skills/` |
| ChatGPT | `.zip` for Skills → Create → Upload |
| Microsoft 365 Copilot Cowork | Skill folder for OneDrive `Documents/Cowork/skills/` |
| Anything else (web chats, Copilot Chat) | A paste-ready prompt |

No server, no API key, no runtime. The compiled files are the product; the assistant's own model does the work.

## Quick start

```bash
npx playbook-kit init        # copies 8 starter playbooks into ./playbooks
npx playbook-kit check       # finds mistakes
npx playbook-kit test        # checks example requests pick the right playbook
npx playbook-kit build       # portable files in ./out (ChatGPT zips, Cowork folders, prompts)
npx playbook-kit install claude,agents   # straight into Claude Code, Codex and Copilot
```

After installing globally (`npm i -g playbook-kit`) the command is just `playbook`.

## A playbook

```markdown
---
name: weekly-report
title: Weekly status report
description: Writes a weekly status report from notes or tickets in the team's structure. Use when someone asks for a weekly report or status update.
version: 1.0.0
owner: platform-team
depth: standard
triggers: [weekly report, status update, progress update]
---

## Ask first
- audience: Who will read it? [Leadership | My team | Clients] (skip if: leadership, manager, team, client)
- period: Which week does it cover? (skip if: this week, last week)
- format: Where will it be sent? [Email | Word doc | Chat] (optional)

## Skills
- docx: produce a Word document when asked (optional)

## Steps
1. List what was done, in progress and blocked.
2. Pick the three most important points for this audience.

## Output
Summary (3 bullets), Done this week, Next week, Risks and blockers. Under one page.

## Done when
- Every risk has an owner and a next step.
- No figure appears that isn't in the sources.

## Examples
- write this week's status update for leadership

## Not for
- a quarterly business review deck
```

Anyone can read and review it. Any extra `## Section` (tone, glossary, templates) is passed to the assistant as written.

| Field | Meaning |
|---|---|
| `depth` | `quick`: ask at most one question. `standard`: ask what's missing, then work. `thorough`: ask everything and confirm a plan first. |
| `(skip if: ...)` | If the request already mentions any of these, the question isn't asked. Matches word forms ("trend" ~ "trends"). |
| `(optional)` | Asked only on thorough playbooks, or when it clearly matters. |
| `skill or other` | Preferred skill, then fallbacks. If none is installed the assistant does that part itself. |
| `## Examples` / `## Not for` | Routing tests. `Not for` is also compiled into the description, so similar skills don't compete. |

You can also ask your assistant to write one: install `skills/playbook-author` and say "help me write a playbook for onboarding new clients".

## Commands

| Command | What it does |
|---|---|
| `playbook init` | Copy the starter playbooks into `./playbooks` |
| `playbook new <name>` | Create a blank playbook |
| `playbook list` | List playbooks with version, depth and owner |
| `playbook check` | Syntax, Agent Skills limits, missing "use when", playbooks competing for the same requests, and skills referenced but not installed on this machine. Exits 1 on errors |
| `playbook test` | Every Example must pick its playbook; no Not for line may. Flags close calls. Exits 1 on failure, so it fits CI |
| `playbook match "<request>"` | Which playbook a request picks, what's already answered and what will be asked |
| `playbook show <name>` | Print the compiled instructions (`--format skill` or `paste`) |
| `playbook build` | Portable outputs in `./out` (`--target skill,chatgpt,cowork,paste`) |
| `playbook install <targets>` | `claude`, `agents`, `copilot`, `cursor`, `gemini`, `copilot-prompt` or `all`. `--user` installs into your home folder |

```text
$ playbook match "make a board deck about Q3 results with 10 slides"
slide-deck score 21.16 · matched: board, deck, q3, result, 10, slid
  already answered: audience, length
  will ask: What is the one thing they must remember? · Is there a template or brand to match?
```

## Use it in CI

Keep playbooks in a shared repository and gate changes:

```yaml
- run: npx playbook-kit check --strict --no-skills
- run: npx playbook-kit test
- run: npx playbook-kit build
```

Publish `./out` however your company shares files, or commit the installed `.claude/skills` and `.agents/skills` folders so everyone who clones the repo gets them.

## Use it as a library

```ts
import { loadPlaybooks, bestPlaybook, openQuestions, renderInstructions } from "playbook-kit";

const playbooks = loadPlaybooks(["./playbooks"]);
const request = "turn these notes into my weekly report for leadership";
const match = bestPlaybook(request, playbooks);

if (match) {
  const ask = openQuestions(match.playbook, request);       // show these in your own UI
  const instructions = renderInstructions(match.playbook);  // send to any model as system text
}
```

Also exported: `parsePlaybook`, `matchPlaybooks`, `testPlaybooks`, `checkPlaybooks`, `renderSkillFile`, `compile`, `indexSkills`.

## Starter playbooks

`weekly-report`, `data-analysis`, `slide-deck`, `customer-reply`, `meeting-summary`, `bug-fix`, `code-review`, `research-brief`. They're starting points; the value comes from editing them to match how your team actually works.

## How matching works, and its limits

Matching is lexical (BM25 over name, description, triggers and examples) and deterministic: the same request always picks the same playbook. A playbook needs real evidence to match: a trigger phrase, or at least two matching words. A request phrased very differently from your triggers and examples may not match, which is why `playbook test` exists: when a real request misroutes, add it as an Example and adjust triggers until the test passes.

Inside each assistant, the compiled skill is chosen by the assistant itself, using the description. playbook-kit makes those descriptions clear and bounded; it doesn't control the assistant's choice.

## Roadmap

- [ ] Measure it: the same tasks with and without playbooks, counting clarification rounds and redos
- [ ] Shared playbook library for common roles (sales, support, finance, engineering)
- [ ] `playbook diff`: what changed between versions, for reviewers
- [ ] Python package with the same API

## Contributing

Playbooks for your domain are the most valuable contribution and need no code. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
