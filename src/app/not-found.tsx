import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Document not found</h1>
      <p className="mt-2 text-ink-muted">It may have been deleted, or it hasn&apos;t been shared with you.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-ink px-4 py-2 text-sm text-white">
        Back to documents
      </Link>
    </main>
  );
}
