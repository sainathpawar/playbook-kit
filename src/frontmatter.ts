/**
 * Minimal, dependency-free parser for SKILL.md frontmatter.
 * Supports the YAML subset skills actually use: scalars, quoted strings,
 * block scalars (| and >), inline lists [a, b], "- item" lists and one level
 * of nested maps (e.g. `metadata:`). Anything fancier is kept as a raw string.
 */
export interface ParsedDoc {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(source: string): ParsedDoc {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) return { data: {}, body: text };
  return { data: parseBlock(match[1].split("\n"), 0).value, body: match[2] };
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function scalar(raw: string): unknown {
  const v = raw.trim();
  if (v === "") return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\"/g, '"');
  }
  if (v.startsWith("[") && v.endsWith("]")) {
    return v.slice(1, -1).split(",").map((s) => String(scalar(s))).filter((s) => s !== "");
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseBlock(lines: string[], start: number, baseIndent = 0): { value: Record<string, unknown>; next: number } {
  const out: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) { i++; continue; }
    const indent = indentOf(line);
    if (indent < baseIndent) break;
    const kv = /^\s*([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) { i++; continue; }
    const [, key, rest] = kv;
    i++;

    if (rest === "|" || rest === ">" || rest === "|-" || rest === ">-") {
      const collected: string[] = [];
      while (i < lines.length && (lines[i].trim() === "" || indentOf(lines[i]) > indent)) {
        collected.push(lines[i].trim());
        i++;
      }
      out[key] = rest.startsWith("|") ? collected.join("\n").trim() : collected.join(" ").replace(/\s+/g, " ").trim();
      continue;
    }

    if (rest.trim() === "") {
      // Either a nested map or a "- item" list.
      if (i < lines.length && lines[i].trim().startsWith("- ")) {
        const items: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("- ")) {
          items.push(String(scalar(lines[i].trim().slice(2))));
          i++;
        }
        out[key] = items;
      } else if (i < lines.length && indentOf(lines[i]) > indent) {
        const nested = parseBlock(lines, i, indentOf(lines[i]));
        out[key] = nested.value;
        i = nested.next;
      } else {
        out[key] = "";
      }
      continue;
    }

    // Plain multi-line scalar continuation (common in hand-written descriptions).
    let value = rest;
    while (i < lines.length && lines[i].trim() !== "" && indentOf(lines[i]) > indent && !/^\s*[A-Za-z0-9_.-]+\s*:/.test(lines[i])) {
      value += " " + lines[i].trim();
      i++;
    }
    out[key] = scalar(value);
  }
  return { value: out, next: i };
}
