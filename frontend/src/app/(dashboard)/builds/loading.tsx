export default function BuildsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 rounded bg-slate-800/50 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
