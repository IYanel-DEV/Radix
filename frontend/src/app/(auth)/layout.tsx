import { Gamepad2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B0A0F] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-radix-500/10">
          <Gamepad2 className="h-7 w-7 text-radix-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white neon-text">Radix</h1>
          <p className="text-xs text-slate-500">Game Server Management</p>
        </div>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
