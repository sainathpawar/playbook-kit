import type { Playbook, Question } from "./types.js";

/**
 * Turns a playbook into plain instructions any agent can follow. This is the whole
 * "runtime": the agent's own model does the work, guided by these instructions.
 */

const DEPTH_GUIDANCE: Record<Playbook["depth"], string> = {
  quick: "This is a quick task. Ask at most one question, only if the request cannot be done without it; otherwise proceed and state your assumptions at the end.",
  standard: "Ask the questions below that the request does not already answer, all in one message. Then do the work without further check-ins unless something blocks you.",
  thorough: "This task is worth getting right. Ask every question below that is not already answered, in one message. Then show a short plan (3-6 lines) and wait for the user's go-ahead before starting.",
};

function questionLine(q: Question): string {
  const opts = q.options.length ? ` (options: ${q.options.join(" / ")})` : "";
  const skip = q.skipIf.length ? ` Skip if the request already mentions ${q.skipIf.map((s) => `"${s}"`).join(", ")}.` : "";
  return `- **${q.id}**: ${q.ask}${opts}${skip}`;
}

/** The description agents route on. Adds the "Not for" boundary so similar skills don't shadow each other. */
export function compiledDescription(p: Playbook): string {
  let d = p.description.trim();
  if (p.notFor.length) {
    const boundary = ` Do not use for: ${p.notFor.join("; ")}.`;
    d = d.replace(/[.\s]*$/, ".") + boundary;
  }
  return d;
}

export function renderInstructions(p: Playbook): string {
  const out: string[] = [];
  out.push(`# ${p.title}`, "");
  out.push(`Team playbook \`${p.name}\` v${p.version}${p.owner ? `, maintained by ${p.owner}` : ""}. Follow it step by step so the result is consistent every time, whoever asks and whichever assistant runs it.`, "");

  let n = 1;
  const required = p.questions.filter((q) => !q.optional);
  const optional = p.questions.filter((q) => q.optional);
  if (p.questions.length) {
    out.push(`## ${n++}. Ask first`, "", DEPTH_GUIDANCE[p.depth], "");
    if (required.length) out.push(...required.map(questionLine), "");
    if (optional.length) {
      out.push(p.depth === "thorough" ? "Also ask:" : "Ask these only if the answer would clearly change the result:", "");
      out.push(...optional.map(questionLine), "");
    }
    out.push("If the user says to just go ahead, use sensible defaults and list every assumption in your final reply.", "");
  }

  if (p.skills.length) {
    out.push(`## ${n++}. Skills to use`, "");
    for (const s of p.skills) {
      const [first, ...alts] = s.names;
      const altText = alts.length ? ` (or ${alts.map((a) => `\`${a}\``).join(", then ")} if that one is not available)` : "";
      const purpose = s.purpose ? ` to ${s.purpose.replace(/^to\s+/i, "")}` : "";
      out.push(`- Use the \`${first}\` skill${altText}${purpose}.${s.optional ? " Optional." : ""}`);
    }
    out.push("", "If none of the listed skills is available, do that part directly and mention it in your reply.", "");
  }

  if (p.steps.length) {
    out.push(`## ${n++}. Steps`, "");
    p.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
    out.push("");
  }

  if (p.output) out.push(`## ${n++}. Output`, "", p.output, "");

  for (const e of p.extra) out.push(`## ${n++}. ${e.heading}`, "", e.body, "");

  if (p.done.length) {
    out.push(`## ${n++}. Before you finish`, "", "Check every item and fix anything that fails before replying:", "");
    out.push(...p.done.map((d) => `- [ ] ${d}`), "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function yamlString(s: string): string {
  return JSON.stringify(s); // JSON strings are valid YAML double-quoted scalars
}

export interface SkillFileOptions {
  /** Only `name` and `description` in frontmatter (Microsoft 365 Copilot Cowork requires exactly these). */
  minimalFrontmatter?: boolean;
}

/** A complete Agent Skills SKILL.md: works in Claude Code, Codex, GitHub Copilot, Cursor, Gemini CLI, ChatGPT. */
export function renderSkillFile(p: Playbook, opts: SkillFileOptions = {}): string {
  const fm = [`name: ${p.name}`, `description: ${yamlString(compiledDescription(p))}`];
  if (!opts.minimalFrontmatter) {
    fm.push("metadata:", `  playbook-version: ${yamlString(p.version)}`);
    if (p.owner) fm.push(`  playbook-owner: ${yamlString(p.owner)}`);
    fm.push(`  generated-by: "playbook-kit"`);
  }
  return `---\n${fm.join("\n")}\n---\n\n${renderInstructions(p)}`;
}

/** For tools without skill support (web chat, Microsoft 365 Copilot Chat): paste, then add the request. */
export function renderPastePrompt(p: Playbook): string {
  return `Follow this playbook for my request. Ask me the open questions first, all in one message.\n\n${renderInstructions(p)}\n---\nMy request: \n`;
}

/** VS Code / GitHub Copilot prompt file: run explicitly with /<name> in chat. */
export function renderCopilotPrompt(p: Playbook): string {
  return `---\ndescription: ${yamlString(p.description.slice(0, 200))}\n---\n\n${renderInstructions(p)}`;
}
