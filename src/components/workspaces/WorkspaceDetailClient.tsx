'use client'

import React, { useState } from 'react'
import type { WorkspaceRow, ArtifactRow } from '@/types/database'
import type { WorkspaceMemberWithUser } from '@/lib/db/workspaces'
import { WorkspaceHeader } from '@/components/workspaces/WorkspaceHeader'
import { ArtifactList } from '@/components/artifacts/ArtifactList'

export interface WorkspaceDetailClientProps {
  workspace: WorkspaceRow
  members: WorkspaceMemberWithUser[]
  artifacts: ArtifactRow[]
}

export function WorkspaceDetailClient({
  workspace,
  members,
  artifacts,
}: WorkspaceDetailClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  return (
    <div className="space-y-8">
      <WorkspaceHeader
        workspace={workspace}
        members={members}
        artifactCount={artifacts.length}
        onNewArtifact={() => setIsCreateModalOpen(true)}
        onImportArtifact={() => setIsImportModalOpen(true)}
      />
      <ArtifactList
        workspaceId={workspace.id}
        artifacts={artifacts}
        isCreateModalOpen={isCreateModalOpen}
        isImportModalOpen={isImportModalOpen}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onCloseCreateModal={() => setIsCreateModalOpen(false)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onCloseImportModal={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
