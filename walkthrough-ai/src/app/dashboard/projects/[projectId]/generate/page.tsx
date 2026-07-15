'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Gem, Building, Palmtree, Leaf, Minus, Sofa,
  Camera, PlaneTakeoff, Rocket, Video,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { OptionGrid, type Option } from '@/components/generate/OptionGrid';
import { trpc } from '@/lib/trpc/client';
import { formatCredits } from '@/lib/utils';
import type { CameraStyle, DesignStyle } from '@prisma/client';

// The generate flow only ever offers the 6 curated styles from the brief —
// Prisma's DesignStyle enum also has OTHER for data-model completeness
// (e.g. imported/legacy prompts), which isn't a user-selectable option here.
type SelectableDesignStyle = Exclude<DesignStyle, 'OTHER'>;

const DESIGN_STYLE_OPTIONS: Option<SelectableDesignStyle>[] = [
  { value: 'LUXURY', label: 'Luxury', description: 'Opulent, polished, high-contrast', icon: Gem },
  { value: 'MODERN', label: 'Modern', description: 'Clean lines, neutral palette', icon: Building },
  { value: 'MEDITERRANEAN', label: 'Mediterranean', description: 'Terracotta, stone, golden hour', icon: Palmtree },
  { value: 'SCANDINAVIAN', label: 'Scandinavian', description: 'Light woods, airy minimalism', icon: Leaf },
  { value: 'MINIMAL', label: 'Minimal', description: 'Restrained, quiet, precise', icon: Minus },
  { value: 'COZY', label: 'Cozy', description: 'Warm, intimate, inviting', icon: Sofa },
];

const CAMERA_STYLE_OPTIONS: Option<CameraStyle>[] = [
  { value: 'GIMBAL', label: 'Gimbal', description: 'Smooth stabilized luxury standard', icon: Camera },
  { value: 'DRONE', label: 'Drone', description: 'Sweeping aerial establishing shots', icon: PlaneTakeoff },
  { value: 'FPV', label: 'FPV', description: 'Fast, energetic flythrough', icon: Rocket },
  { value: 'HANDHELD', label: 'Handheld', description: 'Intimate, editorial, lifestyle', icon: Video },
];

const DURATION_OPTIONS: Option<'5' | '8' | '12' | '20'>[] = [
  { value: '5', label: '5 seconds', description: 'Quick teaser' },
  { value: '8', label: '8 seconds', description: 'Standard highlight' },
  { value: '12', label: '12 seconds', description: 'Full room flow' },
  { value: '20', label: '20 seconds', description: 'Complete walkthrough' },
];

export default function GeneratePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [designStyle, setDesignStyle] = useState<SelectableDesignStyle>('LUXURY');
  const [cameraStyle, setCameraStyle] = useState<CameraStyle>('GIMBAL');
  const [duration, setDuration] = useState<'5' | '8' | '12' | '20'>('8');

  const { data: balance } = trpc.credit.balance.useQuery();

  const generate = trpc.project.generate.useMutation({
    onSuccess: () => {
      toast.success('Generation started — this takes a few minutes');
      router.push(`/dashboard/projects/${projectId}/result`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <Topbar title="Generate walkthrough" />
      <div className="mx-auto max-w-4xl space-y-10 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Step 3 — Choose your look</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These choices flow directly into Agent 3 (Camera Planner) and Agent 4 (Prompt Generator).
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Design style</h3>
          <OptionGrid options={DESIGN_STYLE_OPTIONS} value={designStyle} onChange={setDesignStyle} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Camera style</h3>
          <OptionGrid options={CAMERA_STYLE_OPTIONS} value={cameraStyle} onChange={setCameraStyle} columns={4} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Video length</h3>
          <OptionGrid options={DURATION_OPTIONS} value={duration} onChange={setDuration} columns={4} />
        </section>

        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <p className="text-sm text-muted-foreground">
            Balance: <span className="font-medium text-foreground">{formatCredits(balance?.balance ?? 0)}</span> credits
          </p>
          <Button
            size="lg"
            disabled={generate.isPending}
            onClick={() =>
              generate.mutate({
                projectId,
                designStyle,
                cameraStyle,
                durationSeconds: Number(duration) as 5 | 8 | 12 | 20,
                targetProvider: 'VEO',
              })
            }
          >
            {generate.isPending ? 'Starting…' : 'Generate walkthrough'}
          </Button>
        </div>
      </div>
    </div>
  );
}
