import { StudioApp } from '@/components/studio/StudioApp';

export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <StudioApp projectId={projectId} />;
}
