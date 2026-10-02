import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STARTER_DIR, parsePlaybook, loadPlaybooks, matchPlaybooks, bestPlaybook, testPlaybooks, openQuestions,
  checkPlaybooks, renderSkillFile, compiledDescription, compile, parseFrontmatter, zip,
} from "../dist/index.js";
import { crc32 as crc } from "../dist/zip.js";

const starters = loadPlaybooks([STARTER_DIR]);

const SAMPLE = `---
name: invoice
title: Prepare an invoice
description: Prepares a client invoice from hours or line items. Use when someone asks for an invoice or bill.
version: 2.1.0
owner: finance
depth: quick
triggers: [invoice, bill, billing]
---

Intro text before any heading is ignored.

## Ask first
- client: Who is the invoice for? (skip if: acme)
- currency: Which currency? [INR | USD | EUR] (skip if: inr, usd, eur, ₹, $)
- po: Purchase order number? (optional)

## Skills
- xlsx or csv-analyzer: total the hours
- \`pdf\`: export the invoice (optional)

## Steps
1. Total the line items.
2. Apply tax.

## Output
A PDF invoice.

## Tone
Formal, no emojis.

## Done when
- [ ] Totals add up

## Examples
- make an invoice for acme in USD

## Not for
- chase an unpaid invoice
`;

test("parse: frontmatter, questions, skills, sections", () => {
  const p = parsePlaybook(SAMPLE, "/x/invoice.md");
  assert.deepEqual(p.parseErrors, []);
  assert.equal(p.version, "2.1.0");
  assert.equal(p.depth, "quick");
  assert.deepEqual(p.questions.map((q) => q.id), ["client", "currency", "po"]);
  assert.deepEqual(p.questions[1].options, ["INR", "USD", "EUR"]);
  assert.equal(p.questions[2].optional, true);
  assert.deepEqual(p.skills[0].names, ["xlsx", "csv-analyzer"]);
  assert.equal(p.skills[0].purpose, "total the hours");
  assert.deepEqual(p.skills[1], { names: ["pdf"], purpose: "export the invoice", optional: true });
  assert.deepEqual(p.steps, ["Total the line items.", "Apply tax."]);
  assert.deepEqual(p.done, ["Totals add up"]);
  assert.deepEqual(p.extra, [{ heading: "Tone", body: "Formal, no emojis." }]);
  assert.deepEqual(p.notFor, ["chase an unpaid invoice"]);
});

test("parse: malformed question lines are reported, not dropped silently", () => {
  const p = parsePlaybook("---\nname: x\n---\n## Ask first\n- what is this?\n");
  assert.equal(p.questions.length, 0);
  assert.match(p.parseErrors[0], /must look like/);
});

test("openQuestions skips what the request already answers", () => {
  const p = parsePlaybook(SAMPLE);
  assert.deepEqual(openQuestions(p, "invoice for acme in usd").map((q) => q.id), []);
  assert.deepEqual(openQuestions(p, "invoice for globex").map((q) => q.id), ["client", "currency"]);
  assert.deepEqual(openQuestions(p, "invoice for globex", { client: "Globex", currency: "EUR" }).map((q) => q.id), []);
  assert.deepEqual(openQuestions(p, "invoice", {}, true).map((q) => q.id), ["client", "currency", "po"]);
});

test("openQuestions matches word forms (trend ~ trends)", () => {
  const p = starters.find((x) => x.name === "data-analysis");
  assert.ok(!openQuestions(p, "summarise customer feedback trends").some((q) => q.id === "question"));
});

test("match: every starter example routes to its own playbook, and Not for lines don't", () => {
  const failures = testPlaybooks(starters).filter((r) => !r.pass);
  assert.deepEqual(failures, []);
});

test("match: a single incidental word is not enough", () => {
  assert.equal(bestPlaybook("write a sales cold email", starters), undefined);
});

test("match: deterministic ranking with trigger evidence", () => {
  const a = matchPlaybooks("make a board deck about Q3 results", starters);
  const b = matchPlaybooks("make a board deck about Q3 results", starters);
  assert.deepEqual(a.map((m) => m.playbook.name), b.map((m) => m.playbook.name));
  assert.equal(a[0].playbook.name, "slide-deck");
});

test("check: starters are clean; broken playbooks are caught", () => {
  assert.deepEqual(checkPlaybooks(starters).filter((i) => i.severity !== "info"), []);
  const bad = parsePlaybook("---\nname: Bad_Name\ndescription: does stuff\n---\n");
  const rules = checkPlaybooks([bad, bad]).map((i) => i.rule);
  for (const r of ["duplicate-name", "invalid-name", "missing-trigger", "no-steps", "no-done-criteria", "no-examples"]) assert.ok(rules.includes(r), r);
});

test("check: reports skills that are not installed", () => {
  const p = parsePlaybook(SAMPLE);
  const issues = checkPlaybooks([p], { skills: [{ name: "csv-analyzer", description: "", path: "", source: "", consumes: [], produces: [], frontmatter: {} }] });
  const missing = issues.filter((i) => i.rule === "skill-not-installed");
  assert.equal(missing.length, 1);
  assert.equal(missing[0].severity, "info"); // pdf is optional
});

test("check: overlapping playbooks without boundaries are flagged", () => {
  const a = parsePlaybook("---\nname: report-a\ndescription: Writes the weekly status report for the team. Use when asked for a weekly report.\n---\n");
  const b = parsePlaybook("---\nname: report-b\ndescription: Writes the weekly status report for leadership. Use when asked for a weekly report.\n---\n");
  assert.ok(checkPlaybooks([a, b]).some((i) => i.rule === "overlap" && i.severity === "warning"));
});

test("render: compiled skill is valid frontmatter with the Not for boundary", () => {
  const p = parsePlaybook(SAMPLE);
  const { data, body } = parseFrontmatter(renderSkillFile(p));
  assert.equal(data.name, "invoice");
  assert.match(String(data.description), /Do not use for: chase an unpaid invoice\./);
  assert.equal(data.metadata["playbook-version"], "2.1.0");
  for (const h of ["Ask first", "Skills to use", "Steps", "Output", "Tone", "Before you finish"]) assert.match(body, new RegExp(`## \\d+\\. ${h}`));
  assert.match(body, /Use the `xlsx` skill \(or `csv-analyzer` if that one is not available\) to total the hours\./);
});

test("render: minimal frontmatter for Microsoft 365 Copilot Cowork", () => {
  const { data } = parseFrontmatter(renderSkillFile(parsePlaybook(SAMPLE), { minimalFrontmatter: true }));
  assert.deepEqual(Object.keys(data).sort(), ["description", "name"]);
});

test("compiledDescription stays within the 1024 character limit for starters", () => {
  for (const p of starters) assert.ok(compiledDescription(p).length <= 1024, p.name);
});

test("zip: CRC matches known value and archive is well formed", () => {
  assert.equal(crc(Buffer.from("123456789")), 0xcbf43926);
  const z = zip([{ name: "a/SKILL.md", content: "hello" }]);
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  assert.equal(z.readUInt32LE(z.length - 22), 0x06054b50);
});

test("compile: writes every target to the expected place", () => {
  const root = mkdtempSync(join(tmpdir(), "pbk-"));
  const p = parsePlaybook(SAMPLE);
  compile([p], { targets: ["all"], root });
  for (const f of [
    ".claude/skills/invoice/SKILL.md", ".agents/skills/invoice/SKILL.md", ".github/skills/invoice/SKILL.md",
    ".cursor/skills/invoice/SKILL.md", ".gemini/skills/invoice/SKILL.md", ".github/prompts/invoice.prompt.md",
    "out/skills/invoice/SKILL.md", "out/chatgpt/invoice.zip", "out/cowork/invoice/SKILL.md", "out/paste/invoice.md",
  ]) assert.ok(existsSync(join(root, f)), f);
  assert.match(readFileSync(join(root, "out/paste/invoice.md"), "utf8"), /My request:/);
  assert.throws(() => compile([p], { targets: ["nope"], root }), /Unknown target/);
});
