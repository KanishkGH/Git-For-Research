import React from 'react'
import Link from 'next/link'
import type { ArtifactRow, BranchRow, CommitRow } from '@/types/database'
import { Badge } from '@/components/ui/Badge'
import { BranchSwitcher } from '@/components/artifacts/BranchSwitcher'
import { Button } from '@/components/ui/Button'

export interface ArtifactHeaderProps {
  workspaceId: string
  artifact: ArtifactRow
  branches: BranchRow[]
  activeBranch: BranchRow
  currentCommit: CommitRow | null
  isViewingHistory: boolean
  onSelectBranch: (branchId: string) => void
  onOpenCreateBranch: () => void
  onOpenMerge?: () => void
}

export function ArtifactHeader({
  workspaceId,
  artifact,
  branches,
  activeBranch,
  currentCommit,
  isViewingHistory,
  onSelectBranch,
  onOpenCreateBranch,
  onOpenMerge,
}: ArtifactHeaderProps) {
  const shortHash = currentCommit?.id ? currentCommit.id.slice(0, 7) : 'root'
  const canMerge = branches.length > 1

  return (
    <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
      {/* Breadcrumb back link */}
      <div>
        <Link
          href={`/workspaces/${workspaceId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Workspace
        </Link>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Metadata */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {artifact.name}
          </h1>
          <Badge variant={artifact.artifact_type} size="sm">
            {artifact.artifact_type}
          </Badge>
          {artifact.original_filename && (
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              ({artifact.original_filename})
            </span>
          )}
        </div>

        {/* Branch Switcher & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <BranchSwitcher
            branches={branches}
            activeBranchId={activeBranch.id}
            onSelectBranch={onSelectBranch}
            onOpenCreateBranch={onOpenCreateBranch}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCreateBranch}
            className="text-xs"
          >
            <svg
              className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            New Branch
          </Button>

          {canMerge && onOpenMerge && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenMerge}
              className="text-xs"
            >
              <svg
                className="w-3.5 h-3.5 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M6 9v12" />
                <path d="M18 15V9a9 9 0 0 0-9-9" />
              </svg>
              Merge Branches
            </Button>
          )}
        </div>
      </div>

      {/* Active Commit Status Line */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {isViewingHistory ? 'Inspecting Snapshot:' : 'Active Branch HEAD:'}
        </span>
        <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-[11px]">
          {shortHash}
        </span>
        <span className="text-slate-400">•</span>
        <span className="truncate max-w-md">
          {currentCommit?.message || 'Initial version'}
        </span>
      </div>
    </div>
  )
}
