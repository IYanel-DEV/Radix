'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ServerCreateForm } from '@/components/servers/server-create-form';

export default function CreateServerPage() {
  return (
    <div>
      <PageHeader
        title="Create Server"
        description="Set up a new game server"
      />
      <ServerCreateForm />
    </div>
  );
}
