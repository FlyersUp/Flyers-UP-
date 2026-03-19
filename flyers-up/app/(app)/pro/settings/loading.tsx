export default function ProSettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <section key={idx}>
          <div className="h-3 w-24 rounded bg-surface2 animate-pulse mb-2.5" />
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="h-12 border-b border-border bg-surface2/70 animate-pulse" />
            <div className="h-12 border-b border-border bg-surface2/40 animate-pulse" />
            <div className="h-12 bg-surface2/70 animate-pulse" />
          </div>
        </section>
      ))}
    </div>
  );
}
