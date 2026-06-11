export default function ServersLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded bg-slate-800/50 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
