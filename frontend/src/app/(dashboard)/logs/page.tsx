'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { LogViewer } from '@/components/logs/log-viewer';
import type { LogEntry } from '@/components/logs/log-viewer';

export default function LogsPage() {
  const [logs] = useState<LogEntry[]>([]);

  return (
    <div>
      <PageHeader
        title="Logs"
        description="System-wide log viewer across all servers"
      />
      <LogViewer
        logs={logs}
        title="System Logs"
        height={600}
        showSource
      />
    </div>
  );
}
