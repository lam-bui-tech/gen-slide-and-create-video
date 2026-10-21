import { StudioApp } from '@/components/studio/StudioApp';

export default async function StudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ packId?: string; debug?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  return <StudioApp initialPackId={resolvedParams.packId} />;
}
