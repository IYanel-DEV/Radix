export default function ServerDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded bg-slate-800/50 animate-pulse" />
        <div className="h-8 w-64 rounded bg-slate-800/50 animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-slate-800/30 animate-pulse" />
    </div>
  );
}
