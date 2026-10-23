import { notFound } from 'next/navigation'
import { getWorkspaceById } from '@/lib/db/workspaces'
import { getArtifactById } from '@/lib/db/artifacts'
import { listArtifactBranches } from '@/lib/db/branches'
import { getCommitById, getCommitHistory } from '@/lib/db/commits'
import { ArtifactDetailClient } from '@/components/artifacts/ArtifactDetailClient'
import type { CommitRow } from '@/types/database'

export const dynamic = 'force-dynamic'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface PageProps {
  params: Promise<{
    workspaceId: string
    artifactId: string
  }>
  searchParams: Promise<{
    branch?: string
    commit?: string
  }>
}

export default async function ArtifactDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { workspaceId, artifactId } = await params
  const { branch: queryBranch, commit: queryCommit } = await searchParams

  // 1. Validate route parameter UUID formats
  if (
    !workspaceId ||
    !UUID_REGEX.test(workspaceId) ||
    !artifactId ||
    !UUID_REGEX.test(artifactId)
  ) {
    notFound()
  }

  // 2. Fetch workspace
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace) {
    notFound()
  }

  // 3. Fetch artifact and verify ownership relationship
  const artifact = await getArtifactById(artifactId)
  if (!artifact || artifact.workspace_id !== workspaceId) {
    notFound()
  }

  // 4. Fetch all branches for this artifact
  const branches = await listArtifactBranches(artifactId)
  if (branches.length === 0) {
    notFound()
  }

  // 5. Determine active branch (query param or default branch)
  const defaultBranch = branches.find((b) => b.is_default) || branches[0]
  const activeBranch =
    queryBranch && UUID_REGEX.test(queryBranch)
      ? branches.find((b) => b.id === queryBranch) || defaultBranch
      : defaultBranch

  // 6. Preload commit histories for all branches in parallel
  const initialCommitsByBranch: Record<string, CommitRow[]> = {}
  await Promise.all(
    branches.map(async (branch) => {
      const history = branch.head_commit_id
        ? await getCommitHistory(branch.head_commit_id)
        : []
      initialCommitsByBranch[branch.id] = history
    })
  )

  // 7. Validate optional queryCommit parameter
  let initialSelectedCommitId: string | null = null
  if (queryCommit && UUID_REGEX.test(queryCommit)) {
    const inspectedCommit = await getCommitById(queryCommit)
    if (inspectedCommit && inspectedCommit.artifact_id === artifactId) {
      initialSelectedCommitId = inspectedCommit.id
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArtifactDetailClient
        workspaceId={workspaceId}
        artifact={artifact}
        branches={branches}
        initialBranchId={activeBranch.id}
        initialCommitsByBranch={initialCommitsByBranch}
        initialSelectedCommitId={initialSelectedCommitId}
      />
    </div>
  )
}
