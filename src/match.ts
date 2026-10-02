import { Bm25, tokenize } from "./text.js";
import type { Match, Playbook } from "./types.js";

/** Text a playbook is matched on. Triggers and examples are repeated to weigh them above prose. */
function matchText(p: Playbook): string {
  const name = p.name.replace(/[-_]/g, " ");
  return [name, p.title, p.description, ...p.triggers, ...p.triggers, ...p.examples].join(" \n ");
}

/** Trigger phrases whose every word appears in the request. */
function triggerHits(p: Playbook, words: Set<string>): string[] {
  return p.triggers.filter((t) => {
    const tw = tokenize(t);
    return tw.length > 0 && tw.every((w) => words.has(w));
  });
}

export interface MatchOptions {
  /** Minimum BM25 score for a match. */
  minScore?: number;
  limit?: number;
}

/**
 * Ranks playbooks for a request. Deterministic and offline, so the same request
 * always picks the same playbook, whichever agent or person sends it.
 *
 * A playbook qualifies only on real evidence: one of its trigger phrases appears in
 * the request, or at least two different words match. A single incidental word
 * ("email", "notes") is not enough. Each trigger phrase hit adds to the score.
 */
export function matchPlaybooks(request: string, playbooks: Playbook[], opts: MatchOptions = {}): Match[] {
  if (!playbooks.length) return [];
  const bm = new Bm25(playbooks.map(matchText));
  const words = new Set(tokenize(request));
  const min = opts.minScore ?? 1.5;
  return bm.score(request)
    .map((r) => {
      const hits = triggerHits(playbooks[r.index], words);
      return { ...r, hits, total: r.score + 2 * hits.length };
    })
    .filter((r) => r.score >= min && (r.hits.length > 0 || r.matched.length >= 2))
    .sort((a, b) => b.total - a.total)
    .slice(0, opts.limit ?? 5)
    .map((r) => ({ playbook: playbooks[r.index], score: Number(r.total.toFixed(2)), matchedTerms: r.matched }));
}

export function bestPlaybook(request: string, playbooks: Playbook[], opts?: MatchOptions): Match | undefined {
  return matchPlaybooks(request, playbooks, opts)[0];
}

export interface TestResult {
  playbook: string;
  request: string;
  expect: "match" | "no-match";
  pass: boolean;
  got?: string;
  /** How far ahead the winner was of the runner-up (1.0 = only match). Low margins are fragile. */
  margin?: number;
}

/**
 * Routing regression tests: every "## Examples" request must select its own playbook,
 * and no "## Not for" request may select it.
 */
export function testPlaybooks(playbooks: Playbook[], opts?: MatchOptions): TestResult[] {
  const results: TestResult[] = [];
  for (const p of playbooks) {
    for (const request of p.examples) {
      const ranked = matchPlaybooks(request, playbooks, { ...opts, limit: 2 });
      const top = ranked[0];
      const margin = top ? (ranked[1] ? Number((1 - ranked[1].score / top.score).toFixed(2)) : 1) : undefined;
      results.push({ playbook: p.name, request, expect: "match", pass: top?.playbook.name === p.name, got: top?.playbook.name, margin });
    }
    for (const request of p.notFor) {
      const top = bestPlaybook(request, playbooks, opts);
      results.push({ playbook: p.name, request, expect: "no-match", pass: top?.playbook.name !== p.name, got: top?.playbook.name });
    }
  }
  return results;
}
