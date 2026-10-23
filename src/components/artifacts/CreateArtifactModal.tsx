'use client'

import React, { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createArtifactAction } from '@/app/actions/artifacts'
import type { ArtifactType } from '@/types/database'

export interface CreateArtifactModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
}

const ARTIFACT_TYPE_OPTIONS: { value: ArtifactType; label: string; placeholder: string }[] = [
  {
    value: 'markdown',
    label: 'Markdown Document (.md)',
    placeholder: '# Research Notes\n\nDocument hypotheses, literature synthesis, or methodology...',
  },
  {
    value: 'pdf',
    label: 'PDF Document (Text extraction)',
    placeholder: 'Paste extracted PDF text or initial paper draft content...',
  },
  {
    value: 'chatgpt_export',
    label: 'ChatGPT Conversation Export',
    placeholder: 'Paste exported conversation text or prompt exploration transcripts...',
  },
  {
    value: 'claude_export',
    label: 'Claude Conversation Export',
    placeholder: 'Paste Claude exploration logs or technical synthesis transcripts...',
  },
  {
    value: 'codebase',
    label: 'Codebase / Scripts',
    placeholder: '// Experiment scripts, data processing notebooks, or simulation code...',
  },
]

export function CreateArtifactModal({
  workspaceId,
  isOpen,
  onClose,
}: CreateArtifactModalProps) {
  const [name, setName] = useState('')
  const [artifactType, setArtifactType] = useState<ArtifactType>('markdown')
  const [originalFilename, setOriginalFilename] = useState('')
  const [initialContent, setInitialContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedTypeOption =
    ARTIFACT_TYPE_OPTIONS.find((opt) => opt.value === artifactType) ||
    ARTIFACT_TYPE_OPTIONS[0]

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Artifact name is required.')
      return
    }

    if (trimmedName.length > 150) {
      setError('Artifact name must not exceed 150 characters.')
      return
    }

    const formData = new FormData()
    formData.append('workspaceId', workspaceId)
    formData.append('name', trimmedName)
    formData.append('artifactType', artifactType)
    if (originalFilename.trim()) {
      formData.append('originalFilename', originalFilename.trim())
    }
    formData.append('initialContent', initialContent)

    startTransition(async () => {
      const result = await createArtifactAction(formData)
      if (result.success) {
        setName('')
        setArtifactType('markdown')
        setOriginalFilename('')
        setInitialContent('')
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
      setArtifactType('markdown')
      setOriginalFilename('')
      setInitialContent('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Research Artifact"
      description="Create a versioned document, PDF transcription, or LLM transcript snapshot."
      maxWidth="lg"
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

        {/* Artifact Name & Type Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="artifact-name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Artifact Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="artifact-name"
              type="text"
              required
              disabled={isPending}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Methodology Review.md"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="artifact-type"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Artifact Type
            </label>
            <select
              id="artifact-type"
              disabled={isPending}
              value={artifactType}
              onChange={(e) => setArtifactType(e.target.value as ArtifactType)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
            >
              {ARTIFACT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Original Filename */}
        <div>
          <label
            htmlFor="original-filename"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Original File Name <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            id="original-filename"
            type="text"
            disabled={isPending}
            maxLength={255}
            value={originalFilename}
            onChange={(e) => setOriginalFilename(e.target.value)}
            placeholder="e.g. arxiv_2408_12345.pdf or export_2026_08.json"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        {/* Initial Content */}
        <div>
          <label
            htmlFor="initial-content"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Initial Content (Commit v1.0)
          </label>
          <textarea
            id="initial-content"
            rows={5}
            disabled={isPending}
            value={initialContent}
            onChange={(e) => setInitialContent(e.target.value)}
            placeholder={selectedTypeOption.placeholder}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-y"
          />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Creating an artifact automatically initializes Commit v1.0 and points the default &apos;main&apos; branch to it.
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
            {isPending ? 'Creating Artifact...' : 'Create Artifact'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
