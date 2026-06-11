export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-slate-800/50 animate-pulse" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
