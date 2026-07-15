'use client';

import { useParams, useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { PipelineProgress } from '@/components/pipeline/PipelineProgress';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc/client';
import { isProjectInProgress } from '@/lib/status';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ResultPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { refetchInterval: (q) => (isProjectInProgress(q.state.data?.status ?? 'DRAFT') ? 3000 : false) },
  );
  const { data: videos } = trpc.video.listByProject.useQuery(
    { projectId },
    { refetchInterval: (q) => (q.state.data?.[0]?.status === 'COMPLETED' || q.state.data?.[0]?.status === 'FAILED' ? false : 3000) },
  );
  const { data: prompt } = trpc.prompt.getLatest.useQuery({ projectId }, { enabled: !!project });

  const inProgress = project ? isProjectInProgress(project.status) : true;
  const latestVideo = videos?.[0];

  return (
    <div>
      <Topbar title="Your walkthrough" />
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {inProgress && (
          <>
            <h2 className="font-display text-lg font-semibold">Generating your cinematic walkthrough…</h2>
            <PipelineProgress projectId={projectId} />
          </>
        )}

        {project?.status === 'FAILED' && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Generation failed</p>
                  <p className="text-sm text-muted-foreground">
                    {latestVideo?.error ?? 'Something went wrong in the pipeline.'} Your credits were refunded.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => router.push(`/dashboard/projects/${projectId}/generate`)}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {latestVideo?.status === 'COMPLETED' && (
          <Tabs defaultValue="video">
            <TabsList>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="prompt">Prompt preview</TabsTrigger>
            </TabsList>
            <TabsContent value="video">
              <VideoPlayer video={latestVideo} />
              <Button className="mt-4" variant="outline" onClick={() => router.push(`/dashboard/projects/${projectId}/generate`)}>
                Generate another variant
              </Button>
            </TabsContent>
            <TabsContent value="prompt">
              {prompt ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-muted-foreground">Cinematic prompt</h4>
                    <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm">{prompt.promptText}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-muted-foreground">Negative prompt</h4>
                    <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">{prompt.negativePrompt}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Prompt not available.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
