import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { renderCopilotPrompt, renderPastePrompt, renderSkillFile } from "./render.js";
import type { Playbook } from "./types.js";
import { zip } from "./zip.js";

/**
 * Every target is a format the tool already reads natively. Nothing is hosted;
 * the compiled files are the product.
 */
export interface Target {
  id: string;
  label: string;
  /** "install" targets write into a tool's own folders; "dist" targets write portable files. */
  kind: "install" | "dist";
  /** Where the files go. `user` = home folder instead of the project. */
  write(p: Playbook, ctx: { root: string; out: string; user: boolean }): string;
  howToUse: string;
}

function put(path: string, content: string | Buffer): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

function skillDir(project: string, user: string) {
  return (p: Playbook, ctx: { root: string; user: boolean }) =>
    put(join(ctx.user ? join(homedir(), user) : join(ctx.root, project), p.name, "SKILL.md"), renderSkillFile(p));
}

export const TARGETS: Target[] = [
  { id: "claude", label: "Claude Code", kind: "install", write: skillDir(".claude/skills", ".claude/skills"),
    howToUse: "Claude picks it automatically, or type /<name>." },
  { id: "agents", label: "Codex, GitHub Copilot and other .agents/skills readers", kind: "install", write: skillDir(".agents/skills", ".agents/skills"),
    howToUse: "Picked automatically when relevant." },
  { id: "copilot", label: "GitHub Copilot (VS Code, Visual Studio, CLI)", kind: "install", write: skillDir(".github/skills", ".copilot/skills"),
    howToUse: "Copilot agent mode picks it automatically." },
  { id: "cursor", label: "Cursor", kind: "install", write: skillDir(".cursor/skills", ".cursor/skills"),
    howToUse: "Picked automatically when relevant." },
  { id: "gemini", label: "Gemini CLI", kind: "install", write: skillDir(".gemini/skills", ".gemini/skills"),
    howToUse: "Picked automatically." },
  { id: "copilot-prompt", label: "VS Code Copilot prompt file", kind: "install",
    write: (p, ctx) => put(join(ctx.root, ".github", "prompts", `${p.name}.prompt.md`), renderCopilotPrompt(p)),
    howToUse: "Type /<name> in Copilot Chat." },
  { id: "skill", label: "Portable Agent Skill folder", kind: "dist",
    write: (p, ctx) => put(join(ctx.out, "skills", p.name, "SKILL.md"), renderSkillFile(p)),
    howToUse: "Copy the folder into any tool's skills directory." },
  { id: "chatgpt", label: "ChatGPT Skills upload", kind: "dist",
    write: (p, ctx) => put(join(ctx.out, "chatgpt", `${p.name}.zip`), zip([{ name: `${p.name}/SKILL.md`, content: renderSkillFile(p) }])),
    howToUse: "ChatGPT → Skills → Create → Upload from your computer." },
  { id: "cowork", label: "Microsoft 365 Copilot Cowork", kind: "dist",
    write: (p, ctx) => put(join(ctx.out, "cowork", p.name, "SKILL.md"), renderSkillFile(p, { minimalFrontmatter: true })),
    howToUse: "Copy the folder to OneDrive → Documents/Cowork/skills/." },
  { id: "paste", label: "Paste-anywhere prompt (any chat assistant)", kind: "dist",
    write: (p, ctx) => put(join(ctx.out, "paste", `${p.name}.md`), renderPastePrompt(p)),
    howToUse: "Paste into any chat, then type your request at the end." },
];

export const DEFAULT_DIST = ["skill", "chatgpt", "cowork", "paste"];

export function findTargets(ids: string[]): Target[] {
  const wanted = ids.flatMap((i) => i.split(",")).map((i) => i.trim()).filter(Boolean);
  const expanded = wanted.includes("all") ? TARGETS.map((t) => t.id) : wanted;
  return expanded.map((id) => {
    const t = TARGETS.find((x) => x.id === id);
    if (!t) throw new Error(`Unknown target "${id}". Available: ${TARGETS.map((x) => x.id).join(", ")}, all`);
    return t;
  });
}

export interface CompileOptions {
  targets: string[];
  /** Project root for install targets. */
  root?: string;
  /** Output directory for dist targets. */
  out?: string;
  /** Install into the user's home folders instead of the project. */
  user?: boolean;
}

export function compile(playbooks: Playbook[], opts: CompileOptions): { target: string; playbook: string; path: string }[] {
  const root = resolve(opts.root ?? process.cwd());
  const out = resolve(opts.out ?? join(root, "out"));
  const written: { target: string; playbook: string; path: string }[] = [];
  for (const t of findTargets(opts.targets)) {
    for (const p of playbooks) written.push({ target: t.id, playbook: p.name, path: t.write(p, { root, out, user: !!opts.user }) });
  }
  return written;
}
