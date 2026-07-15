'use client';

import { UserProfile } from '@clerk/nextjs';
import { Topbar } from '@/components/layout/Topbar';

export default function SettingsPage() {
  return (
    <div>
      <Topbar title="Settings" />
      <div className="p-6">
        <UserProfile
          appearance={{
            elements: { rootBox: 'w-full', card: 'shadow-none border border-white/10 bg-card' },
          }}
        />
      </div>
    </div>
  );
}
