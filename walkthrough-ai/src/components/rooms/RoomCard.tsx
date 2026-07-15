'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';
import type { Room, RoomImage, ProjectImage } from '@prisma/client';

const ROOM_TYPES = [
  'LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'DINING_ROOM', 'HOME_OFFICE',
  'HALLWAY', 'ENTRYWAY', 'GARAGE', 'GYM', 'TERRACE', 'BALCONY', 'GARDEN',
  'POOL_AREA', 'ROOFTOP', 'VIEW_EXTERIOR', 'OTHER',
] as const;

type RoomWithImages = Room & { images: (RoomImage & { image: ProjectImage })[] };

export function RoomCard({ projectId, room }: { projectId: string; room: RoomWithImages }) {
  const [name, setName] = useState(room.name);
  const utils = trpc.useUtils();
  const updateRoom = trpc.room.update.useMutation({
    onSuccess: () => utils.room.listByProject.invalidate({ projectId }),
  });

  const primaryImage = room.images.find((ri) => ri.isPrimary)?.image ?? room.images[0]?.image;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-secondary">
        {primaryImage && <Image src={primaryImage.url} alt={room.name} fill className="object-cover" />}
        {room.images.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            +{room.images.length - 1} more angle{room.images.length - 1 === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== room.name && updateRoom.mutate({ roomId: room.id, name: name.trim() })}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium hover:border-input focus:border-input focus:outline-none"
        />
        <Select
          value={room.roomType}
          onValueChange={(v) => updateRoom.mutate({ roomId: room.id, roomType: v as (typeof ROOM_TYPES)[number] })}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROOM_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replaceAll('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
