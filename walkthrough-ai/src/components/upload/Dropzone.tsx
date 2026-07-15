'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadThing } from '@/lib/uploadthing';

export function Dropzone({
  projectId,
  remainingSlots,
  onUploaded,
}: {
  projectId: string;
  remainingSlots: number;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { startUpload } = useUploadThing('propertyImage', {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: () => {
      setUploading(false);
      setProgress(0);
      onUploaded();
      toast.success('Photos uploaded');
    },
    onUploadError: (err) => {
      setUploading(false);
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      if (accepted.length > remainingSlots) {
        toast.error(`You can upload ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} (30 max per project).`);
        return;
      }
      setUploading(true);
      await startUpload(accepted, { projectId });
    },
    [projectId, remainingSlots, startUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    disabled: uploading || remainingSlots <= 0,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-12 text-center transition-colors',
        isDragActive && 'border-primary/50 bg-primary/5',
        (uploading || remainingSlots <= 0) && 'cursor-not-allowed opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <>
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">Uploading… {progress}%</p>
        </>
      ) : (
        <>
          <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Drag & drop photos, or click to browse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            JPG, PNG, or WebP — {remainingSlots > 0 ? `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining` : 'project is full (30 max)'}
          </p>
        </>
      )}
    </div>
  );
}
