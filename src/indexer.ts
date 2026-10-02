import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import type { IndexOptions, Skill } from "./types.js";

/**
 * Where each agent host looks for skills. Because every major host follows the
 * open Agent Skills format (a folder with SKILL.md), one index covers them all.
 * Contributions welcome: add a host here and it is supported everywhere.
 */
export const HOST_SKILL_DIRS: { source: string; user?: string; project?: string }[] = [
  { source: "claude", user: ".claude/skills", project: ".claude/skills" },
  { source: "copilot", user: ".copilot/skills", project: ".github/skills" },
  { source: "codex", user: ".agents/skills", project: ".agents/skills" },
  { source: "codex", user: ".codex/skills" },
  { source: "cursor", user: ".cursor/skills", project: ".cursor/skills" },
  { source: "gemini", user: ".gemini/skills", project: ".gemini/skills" },
  { source: "project", project: "skills" },
];

export function defaultSkillDirs(projectRoot = process.cwd()): { dir: string; source: string }[] {
  const home = homedir();
  const dirs: { dir: string; source: string }[] = [];
  for (const h of HOST_SKILL_DIRS) {
    if (h.user) dirs.push({ dir: join(home, h.user), source: h.source });
    if (h.project) dirs.push({ dir: join(projectRoot, h.project), source: h.source });
  }
  return dirs;
}

function findSkillFiles(dir: string, depth = 3): string[] {
  if (depth < 0 || !existsSync(dir)) return [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }
  const found: string[] = [];
  if (entries.includes("SKILL.md")) found.push(join(dir, "SKILL.md"));
  for (const e of entries) {
    if (e.startsWith(".") || e === "node_modules") continue;
    const p = join(dir, e);
    try { if (statSync(p).isDirectory()) found.push(...findSkillFiles(p, depth - 1)); } catch { /* unreadable */ }
  }
  return found;
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return [];
}

export function loadSkill(skillFile: string, source = "custom"): Skill {
  const { data } = parseFrontmatter(readFileSync(skillFile, "utf8"));
  const meta = (typeof data.metadata === "object" && data.metadata) ? data.metadata as Record<string, unknown> : {};
  return {
    name: String(data.name ?? basename(dirname(skillFile))),
    description: String(data.description ?? "").trim(),
    path: resolve(skillFile),
    source,
    consumes: toList(meta.consumes ?? data.consumes),
    produces: toList(meta.produces ?? data.produces),
    frontmatter: data,
  };
}

/** Scan all known host folders (plus any extra dirs) and return one unified skill index. */
export function indexSkills(opts: IndexOptions = {}): Skill[] {
  const dirs = [
    ...(opts.noDefaultDirs ? [] : defaultSkillDirs(opts.projectRoot)),
    ...(opts.skillDirs ?? []).map((d) => ({ dir: resolve(d), source: "custom" })),
  ];
  const seenPaths = new Set<string>();
  const byIdentity = new Map<string, Skill>();
  for (const { dir, source } of dirs) {
    for (const file of findSkillFiles(dir)) {
      const abs = resolve(file);
      if (seenPaths.has(abs)) continue;
      seenPaths.add(abs);
      let skill: Skill;
      try { skill = loadSkill(abs, source); } catch { continue; }
      // The same skill installed for several hosts is one skill, not a conflict.
      const id = `${skill.name}\u0000${skill.description}`;
      const existing = byIdentity.get(id);
      if (existing) {
        if (!existing.source.split(",").includes(source)) existing.source += `,${source}`;
      } else {
        byIdentity.set(id, skill);
      }
    }
  }
  return [...byIdentity.values()].sort((a, b) => a.name.localeCompare(b.name));
}
