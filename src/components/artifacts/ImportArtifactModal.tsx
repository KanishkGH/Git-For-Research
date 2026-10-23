'use client'

import React, { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ingestArtifactAction, type IngestedArtifactPayload } from '@/app/actions/ingest'

export interface ImportArtifactModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getPreliminaryTypeBadge(filename: string): { label: string; variant: 'markdown' | 'pdf' | 'chatgpt_export' | 'claude_export' | 'codebase' | 'slate' } {
  const name = filename.toLowerCase()
  if (name.endsWith('.pdf')) return { label: 'PDF Document', variant: 'pdf' }
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt'))
    return { label: 'Markdown Document', variant: 'markdown' }
  if (name.endsWith('.json')) return { label: 'LLM Export JSON (ChatGPT / Claude)', variant: 'chatgpt_export' }
  if (name.match(/\.(py|ts|tsx|js|jsx|rs|go|cpp|c|java|r|sql|sh|yaml|yml)$/))
    return { label: 'Codebase Script', variant: 'codebase' }
  return { label: 'Unknown Format', variant: 'slate' }
}

export function ImportArtifactModal({
  workspaceId,
  isOpen,
  onClose,
}: ImportArtifactModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successPayload, setSuccessPayload] = useState<IngestedArtifactPayload | null>(null)

  const [isPending, startTransition] = useTransition()

  const handleFileSelect = (file: File) => {
    setError(null)
    setSuccessPayload(null)

    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum size limit of 15MB.')
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a file to import.')
      return
    }

    setError(null)
    const formData = new FormData()
    formData.append('workspaceId', workspaceId)
    formData.append('file', selectedFile)
    if (customTitle.trim()) {
      formData.append('title', customTitle.trim())
    }

    startTransition(async () => {
      const result = await ingestArtifactAction(formData)
      if (result.success) {
        setSuccessPayload(result.data)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setSelectedFile(null)
      setCustomTitle('')
      setError(null)
      setSuccessPayload(null)
      onClose()
    }
  }

  const handleOpenArtifact = () => {
    if (successPayload) {
      router.push(`/workspaces/${workspaceId}/artifacts/${successPayload.artifact.id}`)
      handleClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Research Artifact"
      description="Upload a Markdown paper, PDF document, or ChatGPT/Claude conversation export to automatically parse and version-control."
      maxWidth="lg"
    >
      <div className="space-y-4">
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

        {/* SUCCESS CONFIRMATION STATE */}
        {successPayload ? (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-base">Artifact Imported Successfully!</h4>
                  <p className="text-xs opacity-90">
                    Extracted canonical text and initialized Commit v1.0 on default &apos;main&apos; branch.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono border-t border-emerald-200 dark:border-emerald-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Artifact Name</span>
                  <span className="font-semibold truncate block">{successPayload.artifact.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Artifact Type</span>
                  <Badge variant={successPayload.artifact.artifact_type} size="sm">
                    {successPayload.artifact.artifact_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Original Filename</span>
                  <span className="truncate block">{successPayload.artifact.original_filename}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Initial Version</span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    Commit {successPayload.initialCommit.id.slice(0, 7)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Word Count</span>
                  <span>{successPayload.metadata.wordCount.toLocaleString()} words</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Active Branch</span>
                  <span className="font-semibold">⑂ main</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                Stay in Workspace
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleOpenArtifact}>
                Open Artifact &rarr;
              </Button>
            </div>
          </div>
        ) : (
          /* IMPORT FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Drag and drop upload box */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".md,.markdown,.txt,.pdf,.json,.py,.ts,.js,.rs,.go"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0])
                  }
                }}
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-850/50'
                  }`}
                >
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop raw files
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Markdown (.md, .txt), PDF papers (.pdf), or ChatGPT/Claude exports (.json)
                  </p>
                  <span className="inline-block mt-3 text-[11px] font-mono text-slate-400">
                    Max size: 15MB
                  </span>
                </div>
              ) : (
                /* Selected File Card */
                <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {selectedFile.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatBytes(selectedFile.size)}
                        </span>
                        <Badge
                          variant={getPreliminaryTypeBadge(selectedFile.name).variant}
                          size="sm"
                          className="text-[10px]"
                        >
                          {getPreliminaryTypeBadge(selectedFile.name).label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isPending}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Optional Title Override */}
            {selectedFile && (
              <div>
                <label
                  htmlFor="custom-artifact-title"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Artifact Title <span className="text-slate-400 font-normal">(Optional — auto-extracted if empty)</span>
                </label>
                <input
                  id="custom-artifact-title"
                  type="text"
                  disabled={isPending}
                  maxLength={150}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Attention Mechanism Deep Dive.md"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

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
                disabled={isPending || !selectedFile}
              >
                {isPending ? 'Processing & Ingesting...' : 'Import & Initialize Versioning'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
