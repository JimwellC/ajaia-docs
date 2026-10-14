"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">The page couldn&apos;t load. Your saved work is safe.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-lg bg-ink px-4 py-2 text-sm text-white">Try again</button>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm">All documents</Link>
      </div>
    </main>
  );
}
