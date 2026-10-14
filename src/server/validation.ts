import { z } from "zod";
import { AppError } from "./errors";

export const MAX_TITLE = 120;
export const MAX_CONTENT_BYTES = 1_000_000;

const title = z
  .string({ error: "Title must be text." })
  .trim()
  .min(1, "Title cannot be empty.")
  .max(MAX_TITLE, `Title must be ${MAX_TITLE} characters or fewer.`);

const content = z
  .string({ error: "Content must be text." })
  .refine((s) => Buffer.byteLength(s) <= MAX_CONTENT_BYTES, "Document is too large.");

export const createDocumentSchema = z.strictObject({ title: title.optional() });

export const updateDocumentSchema = z
  .strictObject({
    title: title.optional(),
    content: content.optional(),
    // The version the client last saw. Required so concurrent edits are detected instead of silently overwritten.
    version: z.number({ error: "Version is required." }).int().positive(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update.");

export const shareSchema = z.strictObject({
    email: z.string({ error: "Enter an email address." }).trim().pipe(z.email({ error: "Enter a valid email address." })),
    role: z.enum(["viewer", "editor"]).default("editor"),
  });

export const updateShareSchema = z.strictObject({ role: z.enum(["viewer", "editor"], { error: "Role must be viewer or editor." }) });

export const sessionSchema = z.strictObject({ userId: z.string().min(1) });

/** Parses input or throws a 400 with the first readable message. */
export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message =
      issue.code === "unrecognized_keys" ? `Unknown field: ${issue.keys.join(", ")}` : issue.message;
    throw new AppError("validation", message);
  }
  return result.data;
}
