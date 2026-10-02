import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import type { Depth, Playbook, Question, Section, SkillRef } from "./types.js";

/**
 * A playbook is a plain Markdown file, so anyone can write and review one:
 *
 *   ---
 *   name: weekly-report
 *   description: Writes the weekly status report. Use when ...
 *   ---
 *   ## Ask first
 *   - audience: Who will read it? [Leadership | Team] (skip if: leadership, team)
 *   ## Skills
 *   - docx-writer or docx: format as a Word document (optional)
 *   ## Steps
 *   1. ...
 *   ## Output / ## Done when / ## Examples / ## Not for
 *
 * Any other "## Heading" section is kept verbatim and passed to the agent.
 */

const SECTION_ALIASES: Record<string, keyof Playbook> = {
  "ask first": "questions", "questions": "questions", "ask": "questions",
  "skills": "skills", "use skills": "skills",
  "steps": "steps", "plan": "steps", "process": "steps",
  "output": "output", "output format": "output", "deliverable": "output",
  "done when": "done", "checks": "done", "checklist": "done", "definition of done": "done",
  "examples": "examples", "example requests": "examples",
  "not for": "notFor", "do not use for": "notFor",
};

const DEPTHS: Depth[] = ["quick", "standard", "thorough"];

function listItems(body: string): string[] {
  const items: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    const m = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(line);
    if (m) items.push(m[1].trim());
    else if (line.trim() && items.length && /^\s{2,}/.test(raw)) items[items.length - 1] += " " + line.trim();
  }
  return items.filter(Boolean);
}

function unquote(s: string): string {
  return s.trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

export function parseQuestion(item: string): Question | string {
  let rest = item;
  let optional = false;
  let skipIf: string[] = [];
  let options: string[] = [];
  rest = rest.replace(/\(\s*skip if\s*:\s*([^)]*)\)/i, (_, list: string) => {
    skipIf = list.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    return "";
  });
  rest = rest.replace(/\(\s*optional\s*\)/i, () => { optional = true; return ""; });
  rest = rest.replace(/\[([^\]]*\|[^\]]*)\]\s*$/, (_, list: string) => {
    options = list.split("|").map((s) => s.trim()).filter(Boolean);
    return "";
  });
  rest = rest.trim();
  const m = /^\**([a-z0-9][a-z0-9_-]*)\**\s*:\s*(.+)$/i.exec(rest);
  if (!m) return `Question "${item}" must look like "- id: Question text? [Option A | Option B] (skip if: word, word)"`;
  return { id: m[1].toLowerCase(), ask: m[2].trim(), options, optional, skipIf };
}

export function parseSkillRef(item: string): SkillRef | string {
  let rest = item;
  let optional = false;
  rest = rest.replace(/\(\s*optional\s*\)/i, () => { optional = true; return ""; }).trim();
  const m = /^`?([a-z0-9][a-z0-9:_` -]*?(?:\s+or\s+`?[a-z0-9][a-z0-9:_-]*`?)*)`?\s*(?::|—|–|-\s)\s*(.*)$/i.exec(rest)
    ?? /^`?([a-z0-9][a-z0-9:_-]*)`?\s*$/i.exec(rest);
  if (!m) return `Skill line "${item}" must look like "- skill-name or other-skill: what it is used for"`;
  const names = m[1].split(/\s+or\s+/i).map((n) => n.replace(/`/g, "").trim()).filter(Boolean);
  return { names, purpose: (m[2] ?? "").trim(), optional };
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

export function parsePlaybook(source: string, path?: string): Playbook {
  const { data, body } = parseFrontmatter(source);
  const errors: string[] = [];
  const fileName = path ? basename(path).replace(/\.(playbook\.)?md$/i, "") : undefined;
  const name = String(data.name ?? fileName ?? "").trim();
  const depthRaw = String(data.depth ?? "standard").toLowerCase() as Depth;
  if (!DEPTHS.includes(depthRaw)) errors.push(`depth must be one of ${DEPTHS.join(", ")} (got "${data.depth}")`);

  const pb: Playbook = {
    name,
    title: String(data.title ?? name.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())),
    description: String(data.description ?? "").replace(/\s+/g, " ").trim(),
    version: String(data.version ?? "0.1.0"),
    owner: data.owner ? String(data.owner) : undefined,
    depth: DEPTHS.includes(depthRaw) ? depthRaw : "standard",
    triggers: toList(data.triggers),
    questions: [], skills: [], steps: [], output: "", done: [], examples: [], notFor: [], extra: [],
    path: path ? resolve(path) : undefined,
    parseErrors: errors,
  };

  // Split the body on "## " headings; text before the first heading is ignored (titles, intros).
  const sections: Section[] = [];
  let current: Section | undefined;
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) { current = { heading: h[1].trim(), body: "" }; sections.push(current); continue; }
    if (current) current.body += line + "\n";
  }

  for (const s of sections) {
    const key = SECTION_ALIASES[s.heading.toLowerCase().replace(/[:.]$/, "")];
    const items = listItems(s.body);
    switch (key) {
      case "questions":
        for (const it of items) {
          const q = parseQuestion(it);
          if (typeof q === "string") errors.push(q); else pb.questions.push(q);
        }
        break;
      case "skills":
        for (const it of items) {
          const r = parseSkillRef(it);
          if (typeof r === "string") errors.push(r); else pb.skills.push(r);
        }
        break;
      case "steps": pb.steps = items; break;
      case "output": pb.output = s.body.trim(); break;
      case "done": pb.done = items; break;
      case "examples": pb.examples = items.map(unquote); break;
      case "notFor": pb.notFor = items.map(unquote); break;
      default: if (s.body.trim()) pb.extra.push({ heading: s.heading, body: s.body.trim() });
    }
  }

  const ids = new Set<string>();
  for (const q of pb.questions) {
    if (ids.has(q.id)) errors.push(`Question id "${q.id}" is used twice`);
    ids.add(q.id);
  }
  return pb;
}

export function loadPlaybookFile(file: string): Playbook {
  return parsePlaybook(readFileSync(file, "utf8"), file);
}

/** Loads every *.md file in the given directories (non-recursive besides one level of folders). */
export function loadPlaybooks(dirs: string[]): Playbook[] {
  const out: Playbook[] = [];
  const seen = new Set<string>();
  const visit = (dir: string, depth: number) => {
    if (!existsSync(dir)) return;
    if (statSync(dir).isFile()) { if (dir.endsWith(".md")) out.push(loadPlaybookFile(dir)); return; }
    for (const e of readdirSync(dir).sort()) {
      if (e.startsWith(".") || e === "node_modules" || /^readme\.md$/i.test(e)) continue;
      const p = join(dir, e);
      const abs = resolve(p);
      if (seen.has(abs)) continue;
      seen.add(abs);
      const st = statSync(p);
      if (st.isDirectory() && depth > 0) visit(p, depth - 1);
      else if (st.isFile() && e.endsWith(".md")) out.push(loadPlaybookFile(p));
    }
  };
  for (const d of dirs) visit(resolve(d), 1);
  return out;
}
