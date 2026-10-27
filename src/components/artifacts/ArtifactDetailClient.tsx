'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { ArtifactRow, BranchRow, CommitRow } from '@/types/database'
import { ArtifactHeader } from '@/components/artifacts/ArtifactHeader'
import { DocumentEditor } from '@/components/artifacts/DocumentEditor'
import { CommitHistoryList } from '@/components/artifacts/CommitHistoryList'
import { CreateBranchModal } from '@/components/artifacts/CreateBranchModal'
import { MergeDialog } from '@/components/merge/MergeDialog'
import type { CompleteMergeResult } from '@/app/actions/merge'
import { getChangesSinceLastVisitAction } from '@/app/actions/change-awareness'
import { computeSemanticDiff } from '@/lib/diff/semantic-diff'
import { SemanticDiffViewer } from '@/components/merge/SemanticDiffViewer'

export interface ArtifactDetailClientProps {
  workspaceId: string
  artifact: ArtifactRow
  branches: BranchRow[]
  initialBranchId: string
  initialCommitsByBranch: Record<string, CommitRow[]>
  initialSelectedCommitId?: string | null
  referencedCommit?: CommitRow | null
  userId: string
  displayName: string
  canEdit: boolean
}

export function ArtifactDetailClient({
  workspaceId,
  artifact,
  branches: initialBranches,
  initialBranchId,
  initialCommitsByBranch,
  initialSelectedCommitId,
  referencedCommit,
  userId,
  displayName,
  canEdit,
}: ArtifactDetailClientProps) {
  // 1. Controlled state
  const [branchList, setBranchList] = useState<BranchRow[]>(initialBranches)
  const [activeBranchId, setActiveBranchId] = useState<string>(initialBranchId)
  const [commitsByBranch, setCommitsByBranch] =
    useState<Record<string, CommitRow[]>>(initialCommitsByBranch)
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(
    initialSelectedCommitId || null
  )
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState<boolean>(false)
  const [isMergeOpen, setIsMergeOpen] = useState<boolean>(false)
  const [branchSourceCommit, setBranchSourceCommit] =
    useState<CommitRow | null>(null)
  const [changeNotice, setChangeNotice] = useState<string[]>([])

  // 2. Computed values
  const activeBranch =
    branchList.find((b) => b.id === activeBranchId) || branchList[0]

  const currentBranchCommits =
    commitsByBranch[activeBranch?.id || ''] || []

  const activeHeadCommit = currentBranchCommits[0] || null

  const currentCommit = selectedCommitId
    ? currentBranchCommits.find((c) => c.id === selectedCommitId) ||
      (referencedCommit?.id === selectedCommitId ? referencedCommit : null) ||
      activeHeadCommit
    : activeHeadCommit

  const previousCommit = currentBranchCommits.find(
    (commit) => commit.id === currentCommit?.parent_commit_id
  )
  const previousContent = previousCommit?.content
  const currentContent = currentCommit?.content
  const versionDiff = useMemo(
    () => previousContent !== undefined && currentContent !== undefined
      ? computeSemanticDiff(previousContent, currentContent)
      : null,
    [previousContent, currentContent]
  )

  const isViewingHistory = Boolean(
    selectedCommitId &&
      activeHeadCommit &&
      selectedCommitId !== activeHeadCommit.id
  )

  useEffect(() => {
    let active = true
    setChangeNotice([])
    if (activeBranch?.id) {
      void getChangesSinceLastVisitAction(workspaceId, artifact.id, activeBranch.id)
        .then((result) => {
          if (active && result.success && result.data) {
            setChangeNotice(result.data.excerpts.length
              ? result.data.excerpts
              : ['This branch changed since your last visit.'])
          }
        })
    }
    return () => { active = false }
  }, [workspaceId, artifact.id, activeBranch?.id])

  // 3. Event Handlers
  const handleSelectBranch = (branchId: string) => {
    setActiveBranchId(branchId)
    setSelectedCommitId(null)
  }

  const handleSelectCommit = (commit: CommitRow) => {
    setSelectedCommitId(commit.id)
  }

  const handleReturnToHead = () => {
    setSelectedCommitId(null)
  }

  const handleOpenCreateBranch = (fromCommit?: CommitRow) => {
    setBranchSourceCommit(fromCommit || activeHeadCommit)
    setIsCreateBranchOpen(true)
  }

  const handleBranchCreated = (newBranch: BranchRow) => {
    // 1. Add new branch to branch list
    setBranchList((prev) => [...prev, newBranch])

    // 2. Seed its commit history from the source commit
    if (branchSourceCommit) {
      setCommitsByBranch((prev) => ({
        ...prev,
        [newBranch.id]: [branchSourceCommit],
      }))
    }

    // 3. Switch to the newly created branch
    setActiveBranchId(newBranch.id)
    setSelectedCommitId(null)
  }

  const handleCommitCreated = (newCommit: CommitRow) => {
    // 1. Prepend new commit to the current branch's commit history
    setCommitsByBranch((prev) => ({
      ...prev,
      [activeBranch.id]: [newCommit, ...(prev[activeBranch.id] || [])],
    }))

    // 2. Update the branch's head_commit_id in local branch list state
    setBranchList((prev) =>
      prev.map((b) =>
        b.id === activeBranch.id ? { ...b, head_commit_id: newCommit.id } : b
      )
    )

    // 3. Keep viewing the new HEAD
    setSelectedCommitId(null)
  }

  const handleMergeCompleted = (result: CompleteMergeResult) => {
    // 1. Prepend merge commit to target branch history
    setCommitsByBranch((prev) => ({
      ...prev,
      [result.targetBranch.id]: [
        result.mergeCommit,
        ...(prev[result.targetBranch.id] || []),
      ],
    }))

    // 2. Update target branch's head_commit_id in branch list
    setBranchList((prev) =>
      prev.map((b) =>
        b.id === result.targetBranch.id
          ? { ...b, head_commit_id: result.mergeCommit.id }
          : b
      )
    )

    // 3. Switch active view to target branch
    setActiveBranchId(result.targetBranch.id)
    setSelectedCommitId(null)
  }

  return (
    <div className="space-y-6">
      {changeNotice.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <strong>Changed since your last visit</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {changeNotice.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      )}
      {/* Header & Controls */}
      <ArtifactHeader
        workspaceId={workspaceId}
        artifact={artifact}
        branches={branchList}
        activeBranch={activeBranch}
        currentCommit={currentCommit}
        isViewingHistory={isViewingHistory}
        onSelectBranch={handleSelectBranch}
        onOpenCreateBranch={() => handleOpenCreateBranch(activeHeadCommit || undefined)}
        onOpenMerge={() => setIsMergeOpen(true)}
        canEdit={canEdit}
      />

      {/* Main Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Document Editor & Commit Bar */}
        <div className="lg:col-span-8 min-h-[500px]">
          <DocumentEditor
            workspaceId={workspaceId}
            artifactId={artifact.id}
            activeBranch={activeBranch}
            currentCommit={currentCommit}
            isViewingHistory={isViewingHistory}
            onCommitCreated={handleCommitCreated}
            onReturnToHead={handleReturnToHead}
            userId={userId}
            displayName={displayName}
            canEdit={canEdit}
          />
        </div>

        {/* Right Column: Commit History Timeline */}
        <div className="lg:col-span-4 space-y-4">
          <CommitHistoryList
            commits={currentBranchCommits}
            activeHeadCommitId={activeHeadCommit?.id || null}
            selectedCommitId={selectedCommitId}
            onSelectCommit={handleSelectCommit}
            onBranchFromCommit={(commit) => handleOpenCreateBranch(commit)}
            canEdit={canEdit}
          />
        </div>
      </div>

      {versionDiff && (
        <section className="space-y-3" aria-label="Changes from previous version">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Changes from previous version
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Comparing the selected snapshot with its parent commit. Green shows additions; red shows removals.
          </p>
          <SemanticDiffViewer
            diffChunks={versionDiff}
            sourceBranchName="selected version"
            targetBranchName="previous version"
          />
        </section>
      )}

      {/* Create Branch Modal */}
      <CreateBranchModal
        isOpen={isCreateBranchOpen}
        onClose={() => setIsCreateBranchOpen(false)}
        workspaceId={workspaceId}
        artifactId={artifact.id}
        fromCommit={branchSourceCommit}
        onBranchCreated={handleBranchCreated}
      />

      {/* Merge & Diff Modal */}
      <MergeDialog
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        workspaceId={workspaceId}
        artifactId={artifact.id}
        branches={branchList}
        activeBranchId={activeBranchId}
        onMergeCompleted={handleMergeCompleted}
      />
    </div>
  )
}
