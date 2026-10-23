'use client'

import React, { useState, useTransition } from 'react'
import type { BranchRow, CommitRow } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createBranchAction } from '@/app/actions/branches'

export interface CreateBranchModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  artifactId: string
  fromCommit: CommitRow | null
  onBranchCreated: (newBranch: BranchRow) => void
}

export function CreateBranchModal({
  isOpen,
  onClose,
  workspaceId,
  artifactId,
  fromCommit,
  onBranchCreated,
}: CreateBranchModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!fromCommit?.id) {
      setError('A source commit is required to fork a new branch.')
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Branch name is required.')
      return
    }

    if (trimmedName.length > 100) {
      setError('Branch name must not exceed 100 characters.')
      return
    }

    if (!/^[a-zA-Z0-9_\-\./]+$/.test(trimmedName)) {
      setError(
        'Branch name can only contain letters, numbers, underscores, dashes, dots, and slashes.'
      )
      return
    }

    const formData = new FormData()
    formData.append('workspaceId', workspaceId)
    formData.append('artifactId', artifactId)
    formData.append('name', trimmedName)
    formData.append('fromCommitId', fromCommit.id)

    startTransition(async () => {
      const result = await createBranchAction(formData)
      if (result.success) {
        setName('')
        setError(null)
        onBranchCreated(result.data)
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setName('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Exploration Branch"
      description="Branching allows diverging hypotheses or revisions without affecting the main line of research."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
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

        {/* Source Commit Information */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
          <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">
            Branching From Commit
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-semibold">
              {fromCommit?.id ? fromCommit.id.slice(0, 7) : 'Unknown'}
            </span>
            <span className="text-slate-800 dark:text-slate-200 truncate">
              {fromCommit?.message || 'Initial snapshot'}
            </span>
          </div>
        </div>

        {/* Branch Name Input */}
        <div>
          <label
            htmlFor="branch-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            New Branch Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-xs font-mono">
              ⑂
            </span>
            <input
              id="branch-name"
              type="text"
              required
              disabled={isPending}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ai-tutors, lit-review-v2, alternative-methods"
              className="w-full pl-7 pr-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              autoFocus
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Use lowercase letters, numbers, hyphens, and slashes.
          </p>
        </div>

        {/* Modal Actions */}
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
            disabled={isPending || !name.trim()}
          >
            {isPending ? 'Creating Branch...' : 'Create Branch'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
