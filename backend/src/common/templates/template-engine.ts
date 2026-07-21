/**
 * Mustache-lite template engine with conditionals — dependency-free.
 *
 * Supported syntax (admin-authored templates, not user input):
 *   {{fieldName}}                        value substitution
 *   {{#if fieldName}} ... {{/if}}        truthy block
 *   {{#if fieldName}} ... {{else}} ... {{/if}}
 *   {{#eq fieldName "value"}} ... {{else}} ... {{/eq}}   equality block
 *
 * Blocks nest arbitrarily. Unknown/blank values render as a ruled blank so a
 * half-filled preview still looks like a legal draft (LegalDesk-style).
 *
 * Truthiness: undefined, null, '', false and 'false' are falsy ("no" from a
 * toggle is a VALUE — use {{#eq}} for multi-option toggles).
 */

export interface RenderOptions {
  /** HTML-escape substituted values (on for anything rendered to HTML/PDF). */
  escapeHtml?: boolean;
  /** Text used for missing values. Default '__________'. */
  blank?: string;
  /** Wrap substituted (non-blank) values — used to bold them in previews. */
  wrapValue?: (v: string) => string;
  /** Wrap blanks — used to style dotted placeholders in previews. */
  wrapBlank?: (blank: string) => string;
}

type Node =
  | { kind: 'text'; text: string }
  | { kind: 'var'; name: string }
  | { kind: 'if'; name: string; yes: Node[]; no: Node[] }
  | { kind: 'eq'; name: string; value: string; yes: Node[]; no: Node[] };

const TOKEN =
  /\{\{\s*(#if|#eq|\/if|\/eq|else)?\s*([\w.]+)?\s*(?:"([^"]*)"|([\w.-]+))?\s*\}\}/g;

interface Token {
  raw: string;
  index: number;
  tag: string | null; // '#if' | '#eq' | '/if' | '/eq' | 'else' | null (plain var)
  name?: string;
  value?: string;
}

function tokenize(body: string): { tokens: Token[]; body: string } {
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(body))) {
    tokens.push({
      raw: m[0],
      index: m.index,
      tag: m[1] ?? null,
      name: m[2],
      value: m[3] ?? m[4],
    });
  }
  return { tokens, body };
}

/** Recursive-descent parse into a node tree. Malformed blocks degrade to text. */
export function parseTemplate(body: string): Node[] {
  const { tokens } = tokenize(body);
  let pos = 0; // char position in body
  let ti = 0; // token index

  function parseNodes(stopTags: string[]): {
    nodes: Node[];
    stopped: Token | null;
  } {
    const nodes: Node[] = [];
    while (ti < tokens.length) {
      const t = tokens[ti];
      if (t.index > pos)
        nodes.push({ kind: 'text', text: body.slice(pos, t.index) });
      if (t.tag && stopTags.includes(t.tag)) {
        // caller consumes this token
        return { nodes, stopped: t };
      }
      ti += 1;
      pos = t.index + t.raw.length;
      if (!t.tag) {
        if (t.name) nodes.push({ kind: 'var', name: t.name });
        continue;
      }
      if (t.tag === '#if' || t.tag === '#eq') {
        const closer = t.tag === '#if' ? '/if' : '/eq';
        const { nodes: yes, stopped } = parseNodes(['else', closer]);
        let no: Node[] = [];
        if (stopped?.tag === 'else') {
          ti += 1;
          pos = stopped.index + stopped.raw.length;
          const r = parseNodes([closer]);
          no = r.nodes;
          if (r.stopped) {
            ti += 1;
            pos = r.stopped.index + r.stopped.raw.length;
          }
        } else if (stopped) {
          ti += 1;
          pos = stopped.index + stopped.raw.length;
        }
        if (t.tag === '#if') {
          nodes.push({ kind: 'if', name: t.name ?? '', yes, no });
        } else {
          nodes.push({
            kind: 'eq',
            name: t.name ?? '',
            value: t.value ?? '',
            yes,
            no,
          });
        }
        continue;
      }
      // stray {{else}}/{{/if}}/{{/eq}} with no opener — keep as literal text
      nodes.push({ kind: 'text', text: t.raw });
    }
    if (pos < body.length) nodes.push({ kind: 'text', text: body.slice(pos) });
    pos = body.length;
    return { nodes, stopped: null };
  }

  return parseNodes([]).nodes;
}

function truthy(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  const s = String(v).trim();
  return s !== '' && s.toLowerCase() !== 'false';
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderTemplate(
  bodyTemplate: string,
  input: Record<string, unknown>,
  opts: RenderOptions = {},
): string {
  const blankText = opts.blank ?? '__________';
  const nodes = parseTemplate(bodyTemplate);

  function evalNodes(list: Node[]): string {
    let out = '';
    for (const n of list) {
      if (n.kind === 'text') {
        out += opts.escapeHtml ? escapeHtml(n.text) : n.text;
      } else if (n.kind === 'var') {
        const raw = input[n.name];
        if (raw === undefined || raw === null || String(raw).trim() === '') {
          out += opts.wrapBlank ? opts.wrapBlank(blankText) : blankText;
        } else {
          let v = String(raw);
          if (opts.escapeHtml) v = escapeHtml(v);
          out += opts.wrapValue ? opts.wrapValue(v) : v;
        }
      } else if (n.kind === 'if') {
        out += evalNodes(truthy(input[n.name]) ? n.yes : n.no);
      } else {
        const match =
          String(input[n.name] ?? '')
            .trim()
            .toLowerCase() === n.value.trim().toLowerCase();
        out += evalNodes(match ? n.yes : n.no);
      }
    }
    return out;
  }

  return evalNodes(nodes);
}
