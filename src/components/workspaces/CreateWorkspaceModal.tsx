'use client'

import React, { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createWorkspaceAction } from '@/app/actions/workspaces'

export interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Workspace name is required.')
      return
    }

    if (trimmedName.length > 100) {
      setError('Workspace name must not exceed 100 characters.')
      return
    }

    const formData = new FormData()
    formData.append('name', trimmedName)
    if (description.trim()) {
      formData.append('description', description.trim())
    }

    startTransition(async () => {
      const result = await createWorkspaceAction(formData)
      if (result.success) {
        setName('')
        setDescription('')
        setError(null)
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setName('')
      setDescription('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Research Workspace"
      description="Workspaces organize related research artifacts, version history, and collaboration."
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

        {/* Workspace Name Input */}
        <div>
          <label
            htmlFor="workspace-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Workspace Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="workspace-name"
            type="text"
            required
            disabled={isPending}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., LLM Reasoning Lab, Quantum Chemistry Review"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            autoFocus
          />
        </div>

        {/* Description Input */}
        <div>
          <label
            htmlFor="workspace-desc"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="workspace-desc"
            rows={3}
            disabled={isPending}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the research scope and goals..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none"
          />
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
            {isPending ? 'Creating...' : 'Create Workspace'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
