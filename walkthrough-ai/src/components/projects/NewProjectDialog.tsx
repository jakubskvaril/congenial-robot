'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOUSE', label: 'House' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'HOTEL_ROOM', label: 'Hotel room' },
  { value: 'AIRBNB', label: 'Airbnb' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]['value']>('VILLA');
  const router = useRouter();
  const utils = trpc.useUtils();

  const createProject = trpc.project.create.useMutation({
    onSuccess: async (project) => {
      await utils.project.list.invalidate();
      setOpen(false);
      setName('');
      router.push(`/dashboard/projects/${project.id}/upload`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>Name your property and tell us what type it is.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Villa Serenity, Mykonos"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Property type</label>
            <Select value={propertyType} onValueChange={(v) => setPropertyType(v as typeof propertyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!name.trim() || createProject.isPending}
            onClick={() => createProject.mutate({ name: name.trim(), propertyType })}
          >
            {createProject.isPending ? 'Creating…' : 'Create & upload photos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
