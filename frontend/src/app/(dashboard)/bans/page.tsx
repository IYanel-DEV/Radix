'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { BanList } from '@/components/bans/ban-list';
import { BanCreateForm } from '@/components/bans/ban-create-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Ban } from '@/types';

export default function BansPage() {
  const [bans] = useState<Ban[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Bans"
        description="Manage player bans across all servers"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Ban
          </Button>
        }
      />
      <BanList
        bans={bans}
        onCreateBan={() => setCreateOpen(true)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Ban</DialogTitle>
          </DialogHeader>
          <BanCreateForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
