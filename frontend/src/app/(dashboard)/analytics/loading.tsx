export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-slate-800/50 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-slate-800/30 animate-pulse" />
    </div>
  );
}
