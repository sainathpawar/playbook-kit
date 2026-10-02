#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  STARTER_DIR, DEFAULT_DIST, TARGETS, checkPlaybooks, compile, indexSkills, loadPlaybooks,
  matchPlaybooks, openQuestions, renderInstructions, renderPastePrompt, renderSkillFile, testPlaybooks,
} from "./index.js";
import type { Issue, Playbook } from "./types.js";

const HELP = `playbook: write a team playbook once, run it in every AI assistant.

Getting started
  playbook init                     Copy the starter playbooks into ./playbooks
  playbook new <name>               Create a blank playbook to fill in

Working with playbooks
  playbook list                     Show your playbooks
  playbook check                    Find mistakes before anyone uses them
  playbook test                     Check that example requests pick the right playbook
  playbook match "<request>"        Which playbook a request would use, and what's still unanswered
  playbook show <name>              Print the instructions an agent will follow

Sharing them
  playbook build                    Portable files in ./out: skill folders, ChatGPT .zip,
                                    Microsoft 365 Copilot Cowork folders, paste-anywhere prompts
  playbook install <targets>        Install into tools: ${TARGETS.filter((t) => t.kind === "install").map((t) => t.id).join(", ")}, all

Options
  --dir <path>      Playbook folder (repeatable; default ./playbooks)
  --out <path>      Output folder for build (default ./out)
  --target <list>   build targets (default ${DEFAULT_DIST.join(",")})
  --user            install into your home folder instead of this project
  --format <f>      show: instructions | skill | paste
  --json            Machine-readable output
  --strict          check: fail on warnings too
`;

interface Args { cmd?: string; rest: string[]; flags: Map<string, string[]>; }
const VALUE_FLAGS = ["dir", "out", "target", "format", "skills"];

function parseArgs(argv: string[]): Args {
  const a: Args = { rest: [], flags: new Map() };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x.startsWith("--")) {
      const [k, inline] = x.slice(2).split("=", 2);
      const v = inline ?? (VALUE_FLAGS.includes(k) ? argv[++i] ?? "" : "true");
      a.flags.set(k, [...(a.flags.get(k) ?? []), v]);
    } else if (!a.cmd) a.cmd = x;
    else a.rest.push(x);
  }
  return a;
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: number, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const ICON: Record<Issue["severity"], string> = { error: c(31, "✖ error"), warning: c(33, "▲ warn "), info: c(36, "● info ") };

function load(args: Args): { playbooks: Playbook[]; usingStarters: boolean } {
  const dirs = args.flags.get("dir");
  if (dirs?.length) return { playbooks: loadPlaybooks(dirs), usingStarters: false };
  if (existsSync("playbooks")) return { playbooks: loadPlaybooks(["playbooks"]), usingStarters: false };
  return { playbooks: loadPlaybooks([STARTER_DIR]), usingStarters: true };
}

const BLANK = (name: string) => `---
name: ${name}
title: ${name.replace(/-/g, " ").replace(/^\w/, (x) => x.toUpperCase())}
description: Describe what this produces. Use when someone asks for ...
version: 0.1.0
owner: your-team
depth: standard
triggers: [first phrase, second phrase]
---

## Ask first
- audience: Who is this for? [Option A | Option B] (skip if: words, that, answer, it)
- detail: Anything optional worth knowing? (optional)

## Skills
- some-skill or fallback-skill: what the skill is used for (optional)

## Steps
1. First thing to do.
2. Second thing to do.

## Output
What the final result looks like: format, length, structure.

## Done when
- A check the agent can verify before replying.

## Examples
- a real request that should use this playbook

## Not for
- a similar request that should use a different playbook
`;

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const flag = (k: string) => args.flags.get(k)?.[0];
  const json = args.flags.has("json");
  if (!args.cmd || args.cmd === "help" || args.flags.has("help")) { process.stdout.write(HELP); return 0; }

  if (args.cmd === "init") {
    const dest = resolve(flag("dir") ?? "playbooks");
    mkdirSync(dest, { recursive: true });
    const copied: string[] = [];
    for (const f of readdirSync(STARTER_DIR).filter((f) => f.endsWith(".md"))) {
      if (existsSync(join(dest, f))) continue;
      cpSync(join(STARTER_DIR, f), join(dest, f));
      copied.push(f);
    }
    console.log(copied.length ? `Added ${copied.length} starter playbooks to ${dest}:\n  ${copied.join("\n  ")}` : `${dest} already has all starter playbooks.`);
    console.log(`\nNext: edit them for your team, then run ${c(1, "playbook check")} and ${c(1, "playbook build")}.`);
    return 0;
  }

  if (args.cmd === "new") {
    const name = args.rest[0];
    if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) { console.error("Usage: playbook new <name>   (lowercase-with-hyphens)"); return 2; }
    const dir = resolve(flag("dir") ?? "playbooks");
    const file = join(dir, `${name}.md`);
    if (existsSync(file)) { console.error(`${file} already exists.`); return 1; }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, BLANK(name));
    console.log(`Created ${file}`);
    return 0;
  }

  const { playbooks, usingStarters } = load(args);
  if (usingStarters && !json) console.error(c(90, "No ./playbooks folder; using the built-in starter playbooks. Run `playbook init` to customise them.\n"));
  const byName = (n: string) => playbooks.find((p) => p.name === n);

  switch (args.cmd) {
    case "list": {
      if (json) { console.log(JSON.stringify(playbooks.map(({ path, name, title, version, owner, depth }) => ({ name, title, version, owner, depth, path })), null, 2)); return 0; }
      for (const p of playbooks) console.log(`${c(1, p.name.padEnd(22))} ${p.title} ${c(90, `v${p.version} · ${p.depth}${p.owner ? ` · ${p.owner}` : ""}`)}`);
      return 0;
    }
    case "check": {
      const skills = args.flags.has("no-skills") ? undefined : indexSkills({ skillDirs: args.flags.get("skills") });
      const issues = checkPlaybooks(playbooks, { skills: skills?.length ? skills : undefined });
      if (json) console.log(JSON.stringify(issues, null, 2));
      else {
        console.log(`Checked ${playbooks.length} playbooks: ${issues.length ? `${issues.length} issue(s)` : "all good"}\n`);
        for (const i of issues) {
          console.log(`${ICON[i.severity]} ${c(1, i.playbook ?? "")} ${c(90, i.rule)}  ${i.message}`);
          if (i.fix) console.log(`         ${c(32, "fix:")} ${i.fix}`);
        }
      }
      const failing = issues.filter((i) => i.severity === "error" || (args.flags.has("strict") && i.severity === "warning"));
      return failing.length ? 1 : 0;
    }
    case "test": {
      const results = testPlaybooks(playbooks);
      if (json) console.log(JSON.stringify(results, null, 2));
      else {
        for (const r of results) {
          const mark = r.pass ? c(32, "✓") : c(31, "✗");
          const detail = r.pass
            ? (r.expect === "match" && r.margin !== undefined && r.margin < 0.15 ? c(33, ` (close call: margin ${r.margin})`) : "")
            : c(31, ` → got ${r.got ?? "no playbook"}`);
          console.log(`${mark} ${c(90, r.playbook.padEnd(20))} ${r.expect === "no-match" ? c(90, "not: ") : ""}${r.request}${detail}`);
        }
        const failed = results.filter((r) => !r.pass).length;
        console.log(`\n${results.length - failed}/${results.length} passed`);
      }
      return results.some((r) => !r.pass) ? 1 : 0;
    }
    case "match": {
      const request = args.rest.join(" ").trim();
      if (!request) { console.error('Usage: playbook match "<request>"'); return 2; }
      const ranked = matchPlaybooks(request, playbooks);
      if (json) {
        console.log(JSON.stringify({
          request,
          match: ranked[0] ? { name: ranked[0].playbook.name, score: ranked[0].score, openQuestions: openQuestions(ranked[0].playbook, request) } : null,
          alternatives: ranked.slice(1).map((m) => ({ name: m.playbook.name, score: m.score })),
        }, null, 2));
        return 0;
      }
      if (!ranked.length) { console.log("No playbook matches. The agent will work without one."); return 0; }
      const top = ranked[0];
      console.log(`${c(1, top.playbook.name)} ${c(90, `score ${top.score} · matched: ${top.matchedTerms.join(", ")}`)}`);
      const open = openQuestions(top.playbook, request);
      const answered = top.playbook.questions.filter((q) => !q.optional && !open.includes(q));
      if (answered.length) console.log(`  already answered: ${answered.map((q) => q.id).join(", ")}`);
      console.log(open.length ? `  will ask: ${open.map((q) => q.ask).join(" · ")}` : "  nothing to ask, ready to start");
      if (ranked.length > 1) console.log(c(90, `  also considered: ${ranked.slice(1).map((m) => `${m.playbook.name} (${m.score})`).join(", ")}`));
      return 0;
    }
    case "show": {
      const p = byName(args.rest[0] ?? "");
      if (!p) { console.error(`No playbook named "${args.rest[0] ?? ""}". Run \`playbook list\`.`); return 2; }
      const fmt = flag("format") ?? "instructions";
      const render = { instructions: renderInstructions, skill: renderSkillFile, paste: renderPastePrompt }[fmt];
      if (!render) { console.error("--format must be instructions, skill or paste"); return 2; }
      process.stdout.write(render(p));
      return 0;
    }
    case "build":
    case "install": {
      const errors = checkPlaybooks(playbooks).filter((i) => i.severity === "error");
      if (errors.length) {
        for (const i of errors) console.error(`${ICON.error} ${i.playbook ?? ""} ${i.message}`);
        console.error("\nFix these first (`playbook check` shows details).");
        return 1;
      }
      const targets = args.cmd === "build" ? (args.flags.get("target") ?? DEFAULT_DIST) : args.rest.length ? args.rest : args.flags.get("target") ?? [];
      if (!targets.length) { console.error(`Usage: playbook install <targets>   e.g. playbook install claude,agents`); return 2; }
      let written;
      try { written = compile(playbooks, { targets, out: flag("out"), user: args.flags.has("user") }); }
      catch (e) { console.error((e as Error).message); return 2; }
      if (json) { console.log(JSON.stringify(written, null, 2)); return 0; }
      const byTarget = new Map<string, number>();
      for (const w of written) byTarget.set(w.target, (byTarget.get(w.target) ?? 0) + 1);
      for (const [id, n] of byTarget) {
        const t = TARGETS.find((x) => x.id === id)!;
        const where = written.find((w) => w.target === id)!.path.replace(process.cwd() + "/", "");
        console.log(`${c(32, "✓")} ${t.label}: ${n} playbook(s), e.g. ${where}`);
        console.log(c(90, `    ${t.howToUse}`));
      }
      return 0;
    }
    default:
      console.error(`Unknown command "${args.cmd}".\n`);
      process.stdout.write(HELP);
      return 2;
  }
}

process.exitCode = main();
