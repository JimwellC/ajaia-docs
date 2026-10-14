import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import { parse, shareSchema, updateDocumentSchema } from "@/server/validation";

const fails = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return (e as AppError).message;
  }
  throw new Error("expected validation to fail");
};

describe("request validation", () => {
  it("trims titles and requires a version on updates", () => {
    expect(parse(updateDocumentSchema, { title: "  Plan  ", version: 1 })).toEqual({ title: "Plan", version: 1 });
    expect(fails(() => parse(updateDocumentSchema, { title: "Plan" }))).toBe("Version is required.");
  });

  it("rejects empty titles, empty patches and unknown fields", () => {
    expect(fails(() => parse(updateDocumentSchema, { title: "   ", version: 1 }))).toBe("Title cannot be empty.");
    expect(fails(() => parse(updateDocumentSchema, { version: 1 }))).toBe("Nothing to update.");
    expect(fails(() => parse(updateDocumentSchema, { version: 1, content: "x", ownerId: "me" }))).toContain(
      "Unknown field",
    );
  });

  it("defaults share role to editor and validates email", () => {
    expect(parse(shareSchema, { email: " jim@ajaia.test " })).toEqual({ email: "jim@ajaia.test", role: "editor" });
    expect(fails(() => parse(shareSchema, { email: "not-an-email" }))).toBe("Enter a valid email address.");
    expect(fails(() => parse(shareSchema, { email: "jim@ajaia.test", role: "admin" }))).toBeTruthy();
  });
});
