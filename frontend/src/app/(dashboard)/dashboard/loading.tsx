export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded bg-slate-800/50 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-800/30 animate-pulse" />
    </div>
  );
}
