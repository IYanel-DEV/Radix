export default function AdminsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded bg-slate-800/50 animate-pulse" />
      <div className="flex gap-4">
        <div className="h-10 w-64 rounded bg-slate-800/30 animate-pulse" />
        <div className="h-10 w-28 rounded bg-slate-800/30 animate-pulse" />
      </div>
      <div className="h-64 rounded-xl bg-slate-800/30 animate-pulse" />
    </div>
  );
}
