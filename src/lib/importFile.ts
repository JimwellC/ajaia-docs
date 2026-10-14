// Turns an uploaded file into a title and editor-ready HTML.
import { Marked } from "marked";
import mammoth from "mammoth";
import { AppError } from "@/server/errors";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

/** Raised for files we refuse to import; the message is safe to show users. */
export class ImportError extends AppError {
  constructor(message: string, code: "validation" | "unsupported_file" | "too_large" = "validation") {
    super(code, message);
  }
}

export function getExtension(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base.slice(0, 120) || "Imported document";
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text: blank lines become paragraph breaks, single newlines become line breaks. */
export function textToHtml(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "<p></p>";
  return normalized
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Images aren't supported by the editor, so they import as their alt text (the readable part).
// Other unsupported markup, such as tables, is unwrapped by the sanitizer, keeping its text.
const markdown = new Marked({ gfm: true, renderer: { image: ({ text }) => text } });

export async function markdownToHtml(md: string) {
  // Raw HTML inside markdown is escaped rather than passed through.
  const safe = md.replace(/</g, "&lt;");
  return markdown.parse(safe, { async: true });
}

export async function fileToDocument(
  filename: string,
  bytes: Buffer,
): Promise<{ title: string; html: string }> {
  const ext = getExtension(filename);
  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    throw new ImportError(`Unsupported file type. Please upload ${SUPPORTED_EXTENSIONS.join(", ")}.`, "unsupported_file");
  }
  if (bytes.byteLength === 0) throw new ImportError("The file is empty.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new ImportError("File is larger than 2 MB.", "too_large");

  let html: string;
  if (ext === ".docx") {
    try {
      const result = await mammoth.convertToHtml({ buffer: bytes });
      html = result.value || "<p></p>";
    } catch {
      throw new ImportError("Could not read this .docx file. It may be corrupted.");
    }
  } else {
    const text = bytes.toString("utf8");
    html = ext === ".md" ? await markdownToHtml(text) : textToHtml(text);
  }
  return { title: titleFromFilename(filename), html };
}
