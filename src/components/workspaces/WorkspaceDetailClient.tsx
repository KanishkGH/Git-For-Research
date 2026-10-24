'use client'

import React, { useState } from 'react'
import type { WorkspaceRow, ArtifactRow } from '@/types/database'
import type { WorkspaceMemberWithUser } from '@/lib/db/workspaces'
import { WorkspaceHeader } from '@/components/workspaces/WorkspaceHeader'
import { ArtifactList } from '@/components/artifacts/ArtifactList'
import { ResearchPanel } from '@/components/research/ResearchPanel'
import { WorkspaceMembers } from '@/components/workspaces/WorkspaceMembers'

export interface WorkspaceDetailClientProps {
  workspace: WorkspaceRow
  members: WorkspaceMemberWithUser[]
  artifacts: ArtifactRow[]
  canManageMembers: boolean
  canEdit: boolean
}

export function WorkspaceDetailClient({
  workspace,
  members,
  artifacts,
  canManageMembers,
  canEdit,
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
        canEdit={canEdit}
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
        canEdit={canEdit}
      />
      <ResearchPanel workspaceId={workspace.id} canEdit={canEdit} />
      <WorkspaceMembers workspaceId={workspace.id} members={members} canManage={canManageMembers} />
    </div>
  )
}
