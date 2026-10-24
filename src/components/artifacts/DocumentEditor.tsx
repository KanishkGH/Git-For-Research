'use client'

import React, { useState, useEffect, useTransition } from 'react'
import type { BranchRow, CommitRow } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { createCommitAction } from '@/app/actions/commits'
import { useCollaborativeText } from '@/lib/collaboration/useCollaborativeText'

export interface DocumentEditorProps {
  workspaceId: string
  artifactId: string
  activeBranch: BranchRow
  currentCommit: CommitRow | null
  isViewingHistory: boolean
  onCommitCreated: (newCommit: CommitRow) => void
  onReturnToHead: () => void
  userId: string
  displayName: string
  canEdit: boolean
}

export function DocumentEditor({
  workspaceId,
  artifactId,
  activeBranch,
  currentCommit,
  isViewingHistory,
  onCommitCreated,
  onReturnToHead,
  userId,
  displayName,
  canEdit,
}: DocumentEditorProps) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const live = useCollaborativeText({
    workspaceId, artifactId, branchId: activeBranch.id, userId, displayName, canEdit,
  })
  const content = isViewingHistory || !live.ready
    ? currentCommit?.content ?? ''
    : live.content

  // Clear action errors when switching to a different snapshot.
  useEffect(() => {
    setError(null)
  }, [currentCommit?.id])

  const handleCommitSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (isViewingHistory) {
      setError('Cannot commit to a historical snapshot. Return to HEAD to save changes.')
      return
    }
    if (!canEdit || !live.ready) {
      setError('The live editor is not ready for changes.')
      return
    }

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setError('Commit message is required.')
      return
    }

    if (trimmedMessage.length > 200) {
      setError('Commit message must not exceed 200 characters.')
      return
    }

    const formData = new FormData()
    formData.append('workspaceId', workspaceId)
    formData.append('artifactId', artifactId)
    formData.append('branchId', activeBranch.id)
    formData.append('content', content)
    formData.append('message', trimmedMessage)

    startTransition(async () => {
      const result = await createCommitAction(formData)
      if (result.success) {
        setMessage('')
        setError(null)
        onCommitCreated(result.data.commit)
      } else {
        setError(result.error)
      }
    })
  }

  const isContentChanged = currentCommit?.content !== content

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Historical View Warning Banner */}
      {isViewingHistory && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>
              Viewing historical snapshot (Commit{' '}
              <strong className="font-mono">{currentCommit?.id.slice(0, 7)}</strong>)
              — <span className="font-semibold">Read Only</span>
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onReturnToHead}
            className="text-xs"
          >
            Return to Active HEAD
          </Button>
        </div>
      )}

      {/* Editor Main Canvas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-800">
        <span role="status" className="text-slate-500">{live.status}</span>
        <span className="text-slate-600 dark:text-slate-300">
          {live.collaborators.length ? live.collaborators.map((person) =>
            `${person.displayName} (${person.status})`
          ).join(', ') : 'No other researchers online'}
        </span>
      </div>
      <div className="flex-1 p-4 sm:p-5 flex flex-col min-h-[360px]">
        <label
          htmlFor="document-content-area"
          className="sr-only"
        >
          Document Content
        </label>
        <textarea
          id="document-content-area"
          value={content}
          onChange={(e) => live.replaceText(e.target.value)}
          onFocus={() => live.setPresenceStatus('editing')}
          onBlur={() => live.setPresenceStatus('viewing')}
          readOnly={isViewingHistory || isPending || !live.ready || !canEdit}
          disabled={isViewingHistory || isPending || !live.ready || !canEdit}
          placeholder="# Document Content&#10;&#10;Start writing or editing your research text here..."
          className={`flex-1 w-full p-4 rounded-lg font-mono text-sm leading-relaxed border transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isViewingHistory
              ? 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-90'
              : 'bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-750'
          }`}
        />
      </div>

      {/* Commit Action Bar (Active HEAD only) */}
      {!isViewingHistory && canEdit && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 sm:px-5">
          {error && (
            <div className="mb-3 p-2.5 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0 text-rose-500"
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

          <form
            onSubmit={handleCommitSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                required
                disabled={isPending}
                maxLength={200}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Commit message (e.g., Update literature review findings)..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isPending}
              disabled={isPending || !live.ready || !message.trim()}
              className="shrink-0 text-xs sm:text-sm"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save &amp; Commit Version
            </Button>
          </form>

          {isContentChanged && (
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Unsaved changes on active branch &apos;{activeBranch.name}&apos;
            </p>
          )}
        </div>
      )}
    </div>
  )
}
