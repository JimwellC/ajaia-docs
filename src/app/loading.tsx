export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl animate-pulse px-6 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-hover" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-hover" />
        ))}
      </div>
    </main>
  );
}
