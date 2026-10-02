/** A skill installed for some agent (Agent Skills spec: a folder containing SKILL.md). */
export interface Skill {
  name: string;
  description: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
  /** Host folder(s) it was found in: claude, copilot, codex, cursor, gemini, project, custom. */
  source: string;
  consumes: string[];
  produces: string[];
  frontmatter: Record<string, unknown>;
}

export interface IndexOptions {
  /** Extra directories to scan for skills. */
  skillDirs?: string[];
  /** Skip the default per-host skill folders. */
  noDefaultDirs?: boolean;
  /** Project root for project-level folders. Defaults to cwd. */
  projectRoot?: string;
}

/** How much ceremony the agent should apply. Set by the playbook author, not guessed. */
export type Depth = "quick" | "standard" | "thorough";

export interface Question {
  id: string;
  ask: string;
  options: string[];
  /** Optional questions are only asked on thorough playbooks, or when the answer clearly matters. */
  optional: boolean;
  /** If the request mentions any of these words or phrases, the question is already answered. */
  skipIf: string[];
}

export interface SkillRef {
  /** Alternatives in order of preference: "docx-writer or docx". */
  names: string[];
  purpose: string;
  optional: boolean;
}

export interface Section {
  heading: string;
  body: string;
}

export interface Playbook {
  name: string;
  title: string;
  description: string;
  version: string;
  owner?: string;
  depth: Depth;
  triggers: string[];
  questions: Question[];
  skills: SkillRef[];
  steps: string[];
  output: string;
  done: string[];
  /** Requests that should select this playbook. Used by `playbook test`. */
  examples: string[];
  /** Requests that must not select it. Also compiled into the description as a boundary. */
  notFor: string[];
  /** Any other "## Heading" sections (team conventions, style rules...), kept verbatim. */
  extra: Section[];
  /** Source file, when loaded from disk. */
  path?: string;
  /** Problems found while parsing, reported by `playbook check`. */
  parseErrors: string[];
}

export type Severity = "error" | "warning" | "info";

export interface Issue {
  severity: Severity;
  rule: string;
  playbook?: string;
  message: string;
  fix?: string;
}

export interface Match {
  playbook: Playbook;
  score: number;
  matchedTerms: string[];
}
