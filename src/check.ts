import { compiledDescription } from "./render.js";
import { similarity } from "./text.js";
import type { Issue, Playbook, Skill } from "./types.js";

const NAME_RULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TRIGGER_HINT = /\b(use (this )?(when|for|whenever|if)|when (the )?(user|someone|you)|whenever)\b/i;

export interface CheckOptions {
  /** Installed skills; when given, skill references are checked against them. */
  skills?: Skill[];
  /** Similarity above which two playbooks are reported as competing for the same requests. */
  overlapThreshold?: number;
}

/**
 * Validates playbooks before they reach anyone's agent: structure, Agent Skills
 * limits on the compiled output, skills that aren't installed, and playbooks
 * that would compete for the same requests.
 */
export function checkPlaybooks(playbooks: Playbook[], opts: CheckOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const add = (i: Issue) => issues.push(i);
  const installed = opts.skills ? new Set(opts.skills.map((s) => s.name)) : undefined;

  const byName = new Map<string, Playbook[]>();
  for (const p of playbooks) byName.set(p.name, [...(byName.get(p.name) ?? []), p]);
  for (const [name, list] of byName) {
    if (list.length > 1) add({ severity: "error", rule: "duplicate-name", playbook: name,
      message: `"${name}" is defined ${list.length} times (${list.map((p) => p.path).join(", ")}).`, fix: "Rename or delete one." });
  }

  for (const p of playbooks) {
    const pb = p.name || p.path || "(unnamed)";
    for (const e of p.parseErrors) add({ severity: "error", rule: "syntax", playbook: pb, message: e });
    if (!p.name) { add({ severity: "error", rule: "missing-name", playbook: pb, message: "No name in frontmatter.", fix: "Add `name: my-playbook`." }); continue; }
    if (!NAME_RULE.test(p.name) || p.name.length > 64) add({ severity: "error", rule: "invalid-name", playbook: pb,
      message: `"${p.name}" is not a valid skill name (lowercase letters, numbers and single hyphens, max 64 characters).` });
    if (p.path && !p.path.replace(/\\/g, "/").match(new RegExp(`/${p.name}(\\.playbook)?\\.md$`))) add({ severity: "info", rule: "file-name", playbook: pb,
      message: `File name does not match the playbook name.`, fix: `Rename the file to ${p.name}.md so it is easy to find.` });

    if (!p.description) add({ severity: "error", rule: "missing-description", playbook: pb,
      message: "No description; agents choose skills by their description.", fix: "Say what it produces and when to use it." });
    else {
      if (!TRIGGER_HINT.test(p.description)) add({ severity: "warning", rule: "missing-trigger", playbook: pb,
        message: "The description says what the playbook does but not when to use it.", fix: 'Add "Use when someone asks for ...".' });
      const compiled = compiledDescription(p);
      if (compiled.length > 1024) add({ severity: "error", rule: "description-too-long", playbook: pb,
        message: `Compiled description is ${compiled.length} characters; the Agent Skills limit is 1024 and tools may cut it off.`,
        fix: "Shorten the description or the Not for list." });
    }

    if (!p.steps.length && !p.output) add({ severity: "warning", rule: "no-steps", playbook: pb,
      message: "No Steps or Output section, so the agent has little to follow.", fix: "Add a ## Steps list." });
    if (!p.done.length) add({ severity: "warning", rule: "no-done-criteria", playbook: pb,
      message: "No Done when checks; the agent can't verify its own result.", fix: "Add 2-5 checkable items under ## Done when." });
    const required = p.questions.filter((q) => !q.optional).length;
    if (required > 4) add({ severity: "warning", rule: "too-many-questions", playbook: pb,
      message: `${required} required questions. People abandon long question lists.`, fix: "Mark less important ones (optional) or add (skip if: ...) hints." });
    if (!p.examples.length) add({ severity: "warning", rule: "no-examples", playbook: pb,
      message: "No Examples, so routing can't be tested.", fix: "Add 2-4 real requests under ## Examples." });

    if (installed) {
      for (const ref of p.skills) {
        const found = ref.names.find((n) => installed.has(n));
        if (!found) add({ severity: ref.optional ? "info" : "warning", rule: "skill-not-installed", playbook: pb,
          message: `None of ${ref.names.map((n) => `"${n}"`).join(", ")} is installed here. The agent will do that part without a skill.`,
          fix: "Install one of them, or add an alternative with `or`." });
      }
    }
  }

  const threshold = opts.overlapThreshold ?? 0.5;
  const named = playbooks.filter((p) => p.name && p.description);
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      const a = named[i], b = named[j];
      if (a.name === b.name) continue;
      const sim = similarity(`${a.title} ${a.description} ${a.triggers.join(" ")}`, `${b.title} ${b.description} ${b.triggers.join(" ")}`);
      if (sim < threshold) continue;
      const bounded = a.notFor.length > 0 && b.notFor.length > 0;
      add({ severity: bounded ? "info" : "warning", rule: "overlap", playbook: `${a.name}, ${b.name}`,
        message: `"${a.name}" and "${b.name}" are ${(sim * 100).toFixed(0)}% similar and may compete for the same requests.`,
        fix: bounded ? "Both have Not for lists; confirm with `playbook test`." : "Add a ## Not for section to each, pointing at the other." });
    }
  }

  const rank = { error: 0, warning: 1, info: 2 } as const;
  return issues.sort((x, y) => rank[x.severity] - rank[y.severity]);
}
