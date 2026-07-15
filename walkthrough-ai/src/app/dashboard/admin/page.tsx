'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { formatCredits } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

export default function AdminPage() {
  const stats = trpc.admin.stats.useQuery(undefined, { retry: false });
  const users = trpc.admin.listUsers.useQuery({ limit: 20 }, { retry: false, enabled: stats.isSuccess });
  const projects = trpc.admin.listProjects.useQuery({ limit: 20 }, { retry: false, enabled: stats.isSuccess });

  if (stats.isError) {
    return (
      <div>
        <Topbar title="Admin" />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="mb-4 h-10 w-10 text-destructive/60" />
          <h3 className="font-display text-lg font-medium">Access denied</h3>
          <p className="mt-1 text-sm text-muted-foreground">This area is restricted to platform administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Admin" />
      <div className="space-y-8 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: 'Users', value: stats.data?.userCount },
            { label: 'Projects', value: stats.data?.projectCount },
            { label: 'Videos generated', value: stats.data?.videoCount },
            { label: 'Completed', value: stats.data?.completedVideoCount },
            { label: 'Active subscriptions', value: stats.data?.activeSubscriptions },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{s.value ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Recent users</h2>
          <Card>
            <CardContent className="divide-y divide-white/5 pt-6">
              {users.data?.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{u._count.projects} projects</p>
                  </div>
                  <span className="text-muted-foreground">{formatCredits(u.creditBalance)} credits</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Recent projects</h2>
          <Card>
            <CardContent className="divide-y divide-white/5 pt-6">
              {projects.data?.projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.user.email} · {p._count.videos} videos</p>
                  </div>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
