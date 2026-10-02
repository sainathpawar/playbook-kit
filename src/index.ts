/**
 * playbook-kit: write a team playbook once, run it in every AI assistant.
 *
 *   import { loadPlaybooks, bestPlaybook, openQuestions, renderInstructions } from "playbook-kit";
 *   const playbooks = loadPlaybooks(["./playbooks"]);
 *   const m = bestPlaybook("weekly status update for leadership", playbooks);
 *   if (m) console.log(openQuestions(m.playbook, "weekly status update for leadership"));
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Playbook, Question } from "./types.js";
import { tokenize } from "./text.js";

/** Folder with the starter playbooks shipped in the package. */
export const STARTER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "playbooks");

/** Questions the request (and any answers already given) don't settle yet. */
export function openQuestions(p: Playbook, request: string, answers: Record<string, string> = {}, includeOptional = p.depth === "thorough"): Question[] {
  const text = ` ${request.toLowerCase()} `;
  const words = new Set(tokenize(request));
  const mentioned = (phrase: string) => {
    // Exact phrase (handles ".csv", "this week"), or every word in any form ("trend" ~ "trends").
    if (new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(text)) return true;
    const pw = tokenize(phrase);
    return pw.length > 0 && pw.every((w) => words.has(w));
  };
  return p.questions.filter((q) =>
    (includeOptional || !q.optional) &&
    !(q.id in answers) &&
    !q.skipIf.some(mentioned));
}

export * from "./types.js";
export { parsePlaybook, loadPlaybooks, loadPlaybookFile, parseQuestion, parseSkillRef } from "./playbook.js";
export { matchPlaybooks, bestPlaybook, testPlaybooks, type MatchOptions, type TestResult } from "./match.js";
export { checkPlaybooks, type CheckOptions } from "./check.js";
export { renderInstructions, renderSkillFile, renderPastePrompt, renderCopilotPrompt, compiledDescription } from "./render.js";
export { compile, findTargets, TARGETS, DEFAULT_DIST, type CompileOptions, type Target } from "./compile.js";
export { indexSkills, loadSkill, defaultSkillDirs, HOST_SKILL_DIRS } from "./indexer.js";
export { parseFrontmatter } from "./frontmatter.js";
export { tokenize, similarity } from "./text.js";
export { zip } from "./zip.js";
