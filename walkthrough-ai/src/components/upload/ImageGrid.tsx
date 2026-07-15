'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, GripVertical } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { ProjectImage } from '@prisma/client';

export function ImageGrid({ projectId, images }: { projectId: string; images: ProjectImage[] }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const reorder = trpc.image.reorder.useMutation({
    onSuccess: () => utils.image.listByProject.invalidate({ projectId }),
  });
  const deleteImage = trpc.image.delete.useMutation({
    onSuccess: () => utils.image.listByProject.invalidate({ projectId }),
  });

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved!);
    reorder.mutate({ projectId, orderedImageIds: reordered.map((i) => i.id) });
    setDragIndex(null);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {images.map((image, i) => (
        <div
          key={image.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-white/10 bg-secondary active:cursor-grabbing"
        >
          <Image src={image.url} alt="" fill className="object-cover" sizes="200px" />
          <div className="absolute inset-0 flex items-start justify-between bg-black/0 p-1.5 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
            <GripVertical className="h-4 w-4 text-white/80" />
            <button
              onClick={(e) => {
                e.preventDefault();
                deleteImage.mutate({ projectId, imageId: image.id });
              }}
              className="rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
