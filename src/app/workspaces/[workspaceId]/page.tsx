import { notFound } from 'next/navigation'
import { getWorkspaceById, getWorkspaceMembers } from '@/lib/db/workspaces'
import { listWorkspaceArtifacts } from '@/lib/db/artifacts'
import { WorkspaceDetailClient } from '@/components/workspaces/WorkspaceDetailClient'

export const dynamic = 'force-dynamic'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface PageProps {
  params: Promise<{
    workspaceId: string
  }>
}

export default async function WorkspaceDetailPage({ params }: PageProps) {
  const { workspaceId } = await params

  // 1. Validate UUID format
  if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
    notFound()
  }

  // 2. Fetch workspace
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace) {
    notFound()
  }

  // 3. Fetch workspace members and artifacts in parallel
  const [members, artifacts] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    listWorkspaceArtifacts(workspaceId),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WorkspaceDetailClient
        workspace={workspace}
        members={members}
        artifacts={artifacts}
      />
    </div>
  )
}
