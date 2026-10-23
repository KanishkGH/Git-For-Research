'use client'

import React, { useState, useTransition } from 'react'
import type { BranchRow } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  prepareMergeAction,
  completeMergeAction,
  type PrepareMergeResult,
  type CompleteMergeResult,
} from '@/app/actions/merge'
import { SemanticDiffViewer } from '@/components/merge/SemanticDiffViewer'
import { ConflictResolver } from '@/components/merge/ConflictResolver'
import { MergeStatusPanel } from '@/components/merge/MergeStatusPanel'

export interface MergeDialogProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  artifactId: string
  branches: BranchRow[]
  activeBranchId: string
  onMergeCompleted: (result: CompleteMergeResult) => void
}

export function MergeDialog({
  isOpen,
  onClose,
  workspaceId,
  artifactId,
  branches,
  activeBranchId,
  onMergeCompleted,
}: MergeDialogProps) {
  // 1. Branch selection state
  const defaultTarget =
    branches.find((b) => b.id === activeBranchId) || branches[0]
  const defaultSource =
    branches.find((b) => b.id !== defaultTarget?.id) || branches[0]

  const [sourceBranchId, setSourceBranchId] = useState<string>(
    defaultSource?.id || ''
  )
  const [targetBranchId, setTargetBranchId] = useState<string>(
    defaultTarget?.id || ''
  )

  // 2. Merge preparation & resolution state
  const [prepResult, setPrepResult] = useState<PrepareMergeResult | null>(null)
  const [successResult, setSuccessResult] = useState<CompleteMergeResult | null>(null)
  const [activeTab, setActiveTab] = useState<'diff' | 'resolver'>('diff')
  const [resolvedContent, setResolvedContent] = useState<string>('')
  const [isCleanToSubmit, setIsCleanToSubmit] = useState<boolean>(true)
  const [commitMessage, setCommitMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const handlePrepare = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (sourceBranchId === targetBranchId) {
      setError('Source and Target branches must be different.')
      return
    }

    const formData = new FormData()
    formData.append('workspaceId', workspaceId)
    formData.append('artifactId', artifactId)
    formData.append('sourceBranchId', sourceBranchId)
    formData.append('targetBranchId', targetBranchId)

    startTransition(async () => {
      const result = await prepareMergeAction(formData)
      if (result.success) {
        setPrepResult(result.data)
        setResolvedContent(result.data.mergedContent)
        setIsCleanToSubmit(!result.data.hasConflicts)
        setActiveTab(result.data.hasConflicts ? 'resolver' : 'diff')

        const sBranch = branches.find((b) => b.id === sourceBranchId)
        const tBranch = branches.find((b) => b.id === targetBranchId)
        setCommitMessage(
          `Merge branch '${sBranch?.name || 'source'}' into '${tBranch?.name || 'target'}'`
        )
      } else {
        setError(result.error)
      }
    })
  }

  const handleCompleteMerge = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!prepResult) return

    const trimmedMsg = commitMessage.trim()
    if (!trimmedMsg) {
      setError('Commit message is required.')
      return
    }

    const formData = new FormData()
    formData.append('workspaceId', workspaceId)
    formData.append('artifactId', artifactId)
    formData.append('mergeRecordId', prepResult.mergeRecord.id)
    formData.append('resolvedContent', resolvedContent)
    formData.append('commitMessage', trimmedMsg)

    startTransition(async () => {
      const result = await completeMergeAction(formData)
      if (result.success) {
        setSuccessResult(result.data)
        onMergeCompleted(result.data)
      } else {
        setError(result.error)
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setPrepResult(null)
      setSuccessResult(null)
      setError(null)
      setResolvedContent('')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Merge Exploration Branches"
      description="Converge research branches back together with 3-way semantic diffing and conflict resolution."
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Error Banner */}
        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <svg
              className="w-4 h-4 shrink-0 text-rose-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 3: Success Confirmation State */}
        {successResult ? (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-base">Merge Completed Successfully!</h4>
                  <p className="text-xs opacity-90">
                    Dual-parent merge commit has been created and the target branch HEAD has been advanced.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono border-t border-emerald-200 dark:border-emerald-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Source Branch</span>
                  <span className="font-semibold">{prepResult?.sourceBranch.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Target Branch</span>
                  <span className="font-semibold">{prepResult?.targetBranch.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Merge Commit</span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {successResult.mergeCommit.id.slice(0, 7)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Target HEAD</span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {successResult.targetBranch.head_commit_id?.slice(0, 7)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Parent (Target)</span>
                  <span>{successResult.mergeCommit.parent_commit_id?.slice(0, 7)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Merge Parent (Source)</span>
                  <span>{successResult.mergeCommit.merge_parent_id?.slice(0, 7)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="primary" size="sm" onClick={handleClose}>
                Done &amp; View History
              </Button>
            </div>
          </div>
        ) : !prepResult ? (
          /* STEP 1: Branch Selection */
          <form onSubmit={handlePrepare} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source Branch */}
              <div>
                <label
                  htmlFor="source-branch-select"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Source Branch (Incoming changes)
                </label>
                <select
                  id="source-branch-select"
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.is_default ? '(default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Branch */}
              <div>
                <label
                  htmlFor="target-branch-select"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Target Branch (Into which to merge)
                </label>
                <select
                  id="target-branch-select"
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.is_default ? '(default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isPending}
                disabled={isPending || sourceBranchId === targetBranchId}
              >
                {isPending ? 'Analyzing Branches...' : 'Compare & Prepare Merge'}
              </Button>
            </div>
          </form>
        ) : (
          /* STEP 2: Review, Diff & Conflict Resolution */
          <div className="space-y-4">
            <MergeStatusPanel
              sourceBranch={prepResult.sourceBranch}
              targetBranch={prepResult.targetBranch}
              commonAncestorCommit={prepResult.commonAncestorCommit}
              hasConflicts={prepResult.hasConflicts}
              conflictCount={prepResult.conflicts.length}
            />

            {/* View Mode Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'diff'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Semantic Diff Preview
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('resolver')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'resolver'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Conflict Resolver &amp; Editor
                {prepResult.hasConflicts && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            </div>

            {/* Tab 1: Diff Preview */}
            {activeTab === 'diff' && (
              <SemanticDiffViewer
                diffChunks={prepResult.diffTargetVsSource}
                sourceBranchName={prepResult.sourceBranch.name}
                targetBranchName={prepResult.targetBranch.name}
              />
            )}

            {/* Tab 2: Conflict Resolver */}
            {activeTab === 'resolver' && (
              <ConflictResolver
                conflicts={prepResult.conflicts}
                initialMergedContent={resolvedContent}
                sourceBranchName={prepResult.sourceBranch.name}
                targetBranchName={prepResult.targetBranch.name}
                onContentChange={(updated, clean) => {
                  setResolvedContent(updated)
                  setIsCleanToSubmit(clean)
                }}
              />
            )}

            {/* Merge Commit Form */}
            <form onSubmit={handleCompleteMerge} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label
                  htmlFor="merge-commit-message"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Merge Commit Message
                </label>
                <input
                  id="merge-commit-message"
                  type="text"
                  required
                  disabled={isPending}
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrepResult(null)}
                  disabled={isPending}
                >
                  &larr; Choose Different Branches
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isPending}
                    disabled={isPending || !isCleanToSubmit || !commitMessage.trim()}
                  >
                    {isPending ? 'Merging...' : 'Complete & Commit Merge'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  )
}
