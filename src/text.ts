/**
 * Small, deterministic text utilities. No models, no network, no API keys:
 * routing must work offline and give the same answer every time.
 */
const STOPWORDS = new Set((
  "a an and are as at be by for from has have i in is it its of on or that the this to was were will with " +
  "use used using when whenever user users any also can should do does not no me my our your you we they them " +
  "into about more most other some such than then there these those only own same so very just how what which who " +
  "want wants need needs make makes help helps skill skills task tasks work working asks ask asked like e.g eg etc " +
  "after before into onto turn turns get got please thing things something anything all each every new " +
  "write writes writing create creates creating draft give show tell see look do done can could would"
).split(" "));

/** Very light stemmer: enough to match "reports"/"reporting"/"report". */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  for (const suf of ["ations", "ation", "ings", "ing", "ers", "er", "ed", "s"]) {
    if (w.length > suf.length + 3 && w.endsWith(suf) && !w.endsWith("ss")) { w = w.slice(0, -suf.length); break; }
  }
  // "create"/"created"/"creating" and "slide"/"slides" collapse to the same stem.
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#]*/g) ?? [])
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

export class Bm25 {
  private docs: string[][];
  private df = new Map<string, number>();
  private avgLen: number;
  constructor(docs: string[], private k1 = 1.4, private b = 0.6) {
    this.docs = docs.map(tokenize);
    for (const d of this.docs) for (const t of new Set(d)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgLen = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length);
  }
  score(query: string): { index: number; score: number; matched: string[] }[] {
    const q = [...new Set(tokenize(query))];
    const N = this.docs.length;
    return this.docs.map((doc, index) => {
      let score = 0;
      const matched: string[] = [];
      for (const term of q) {
        const tf = doc.filter((t) => t === term).length;
        if (!tf) continue;
        matched.push(term);
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * doc.length / (this.avgLen || 1)));
      }
      return { index, score, matched };
    });
  }
}

/** Cosine similarity of term-frequency vectors, used to detect overlapping skill descriptions. */
export function similarity(a: string, b: string): number {
  const va = new Map<string, number>();
  const vb = new Map<string, number>();
  for (const t of tokenize(a)) va.set(t, (va.get(t) ?? 0) + 1);
  for (const t of tokenize(b)) vb.set(t, (vb.get(t) ?? 0) + 1);
  let dot = 0, na = 0, nb = 0;
  for (const [t, v] of va) { na += v * v; dot += v * (vb.get(t) ?? 0); }
  for (const v of vb.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
