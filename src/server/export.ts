// Converts stored document HTML (already limited to the allowlist in sanitize.ts) into
// Markdown or plain text for download. Only the allowlisted tags need handling;
// anything else falls back to its text.
import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";

export type ExportFormat = "md" | "txt";

export const EXPORT_FORMATS: Record<ExportFormat, { contentType: string }> = {
  md: { contentType: "text/markdown; charset=utf-8" },
  txt: { contentType: "text/plain; charset=utf-8" },
};

const isElement = (n: ChildNode): n is Element => n.type === "tag";

function textOf(node: ChildNode): string {
  if (node.type === "text") return node.data;
  if (isElement(node)) return node.children.map(textOf).join("");
  return "";
}

/** Escapes characters that would otherwise turn plain text into Markdown syntax. */
function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_[\]~<])/g, "\\$1");
}

/** Escapes Markdown that only matters at the start of a line (headings, quotes, lists). */
function escapeLineStart(line: string) {
  return line.replace(/^(\s*)(#{1,6}\s|>|[-+]\s|\d+\.\s)/, (_m, sp: string, mark: string) => `${sp}\\${mark}`);
}

const indent = (text: string, prefix: string) =>
  text
    .split("\n")
    .map((l, i) => (i === 0 ? l : l ? prefix.replace(/./g, " ") + l : l))
    .join("\n");

function inline(nodes: ChildNode[], md: boolean): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return md ? escapeMarkdown(n.data) : n.data;
      if (!isElement(n)) return "";
      const inner = inline(n.children, md);
      if (!md) {
        if (n.name === "br") return "\n";
        if (n.name === "a" && n.attribs.href && n.attribs.href !== textOf(n)) return `${inner} (${n.attribs.href})`;
        return inner;
      }
      switch (n.name) {
        case "br":
          return "  \n";
        case "strong":
        case "b":
          return inner ? `**${inner}**` : "";
        case "em":
        case "i":
          return inner ? `*${inner}*` : "";
        case "s":
          return inner ? `~~${inner}~~` : "";
        case "code": {
          const raw = textOf(n);
          const fence = raw.includes("`") ? "``" : "`";
          return `${fence}${raw}${fence}`;
        }
        case "a":
          return n.attribs.href ? `[${inner}](${n.attribs.href})` : inner;
        default:
          return inner; // u has no Markdown equivalent: keep the text
      }
    })
    .join("");
}

function blocks(nodes: ChildNode[], md: boolean): string[] {
  const out: string[] = [];
  let loose: ChildNode[] = []; // inline content sitting directly in a block container
  const flushLoose = () => {
    const text = inline(loose, md).trim();
    if (text) out.push(md ? text.split("\n").map(escapeLineStart).join("\n") : text);
    loose = [];
  };

  for (const n of nodes) {
    if (!isElement(n) || !["p", "h1", "h2", "h3", "ul", "ol", "blockquote", "pre", "hr", "li"].includes(n.name)) {
      loose.push(n);
      continue;
    }
    flushLoose();
    switch (n.name) {
      case "p": {
        const text = inline(n.children, md);
        out.push(md ? text.split("\n").map(escapeLineStart).join("\n") : text);
        break;
      }
      case "h1":
      case "h2":
      case "h3": {
        const text = inline(n.children, md).replace(/\s*\n\s*/g, " ");
        out.push(md ? `${"#".repeat(Number(n.name[1]))} ${text}` : text);
        break;
      }
      case "ul":
      case "ol": {
        const items = n.children.filter((c): c is Element => isElement(c) && c.name === "li");
        out.push(
          items
            .map((li, i) => {
              const marker = n.name === "ol" ? `${i + 1}. ` : md ? "- " : "• ";
              return marker + indent(blocks(li.children, md).join("\n"), marker);
            })
            .join("\n"),
        );
        break;
      }
      case "li":
        out.push(blocks(n.children, md).join("\n"));
        break;
      case "blockquote": {
        const inner = blocks(n.children, md).join("\n\n");
        out.push(md ? inner.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n") : inner);
        break;
      }
      case "pre": {
        const code = textOf(n).replace(/\n$/, "");
        out.push(md ? `\`\`\`\n${code}\n\`\`\`` : code);
        break;
      }
      case "hr":
        out.push(md ? "---" : "----------");
        break;
    }
  }
  flushLoose();
  return out;
}

export function htmlToMarkdown(html: string): string {
  return blocks(parseDocument(html).children, true).join("\n\n").trim() + "\n";
}

export function htmlToPlainText(html: string): string {
  return blocks(parseDocument(html).children, false).join("\n\n").trim() + "\n";
}

/** Full document export: a title line followed by the content. */
export function renderExport(title: string, html: string, format: ExportFormat): string {
  return format === "md" ? `# ${escapeMarkdown(title)}\n\n${htmlToMarkdown(html)}` : `${title}\n\n${htmlToPlainText(html)}`;
}

/** Content-Disposition header with a safe ASCII fallback and the full UTF-8 name. */
export function contentDisposition(title: string, format: ExportFormat): string {
  const base = title.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "document";
  const ascii = base.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim() || "document";
  return `attachment; filename="${ascii}.${format}"; filename*=UTF-8''${encodeURIComponent(`${base}.${format}`)}`;
}
