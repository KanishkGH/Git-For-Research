'use client'

import React from 'react'
import type { ArtifactRow } from '@/types/database'
import { ArtifactCard } from '@/components/artifacts/ArtifactCard'
import { CreateArtifactModal } from '@/components/artifacts/CreateArtifactModal'
import { ImportArtifactModal } from '@/components/artifacts/ImportArtifactModal'
import { Button } from '@/components/ui/Button'

export interface ArtifactListProps {
  workspaceId: string
  artifacts: ArtifactRow[]
  isCreateModalOpen: boolean
  isImportModalOpen: boolean
  onOpenCreateModal: () => void
  onCloseCreateModal: () => void
  onOpenImportModal: () => void
  onCloseImportModal: () => void
}

export function ArtifactList({
  workspaceId,
  artifacts,
  isCreateModalOpen,
  isImportModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
  onOpenImportModal,
  onCloseImportModal,
}: ArtifactListProps) {
  return (
    <div className="space-y-4">
      {/* Section Subheading & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Research Artifacts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All version-controlled documents, PDFs, and chat transcripts in this workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenCreateModal}>
            <svg
              className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Artifact
          </Button>

          <Button variant="primary" size="sm" onClick={onOpenImportModal}>
            <svg
              className="w-3.5 h-3.5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Import File
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {artifacts.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No research artifacts yet.
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Import a Markdown paper, PDF draft, or conversation transcript to begin version-controlling research.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onOpenCreateModal}>
              Create Manually
            </Button>
            <Button variant="primary" size="sm" onClick={onOpenImportModal}>
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Import File
            </Button>
          </div>
        </div>
      ) : (
        /* Artifact Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} />
          ))}
        </div>
      )}

      {/* Manual Creation Modal */}
      <CreateArtifactModal
        workspaceId={workspaceId}
        isOpen={isCreateModalOpen}
        onClose={onCloseCreateModal}
      />

      {/* Raw File Import Modal */}
      <ImportArtifactModal
        workspaceId={workspaceId}
        isOpen={isImportModalOpen}
        onClose={onCloseImportModal}
      />
    </div>
  )
}
