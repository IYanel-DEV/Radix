export default function PlayerDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded bg-slate-800/50 animate-pulse" />
        <div className="h-8 w-48 rounded bg-slate-800/50 animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-800/30 animate-pulse" />
    </div>
  );
}
