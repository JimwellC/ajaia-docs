// Wraps route handlers so every error becomes a consistent JSON response:
// { error: { code, message, ...details } }
import { NextResponse } from "next/server";
import { AppError } from "./errors";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json({ error: { code: e.code, message: e.message, ...e.details } }, { status: e.status });
      }
      console.error(`[${req.method} ${new URL(req.url).pathname}]`, e);
      return NextResponse.json(
        { error: { code: "internal", message: "Something went wrong. Please try again." } },
        { status: 500 },
      );
    }
  };
}

/** Reads a JSON body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("validation", "Request body must be valid JSON.");
  }
}
