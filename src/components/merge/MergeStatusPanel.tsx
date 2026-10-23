import React from 'react'
import type { BranchRow, CommitRow } from '@/types/database'
import { Badge } from '@/components/ui/Badge'

export interface MergeStatusPanelProps {
  sourceBranch: BranchRow
  targetBranch: BranchRow
  commonAncestorCommit: CommitRow | null
  hasConflicts: boolean
  conflictCount: number
}

export function MergeStatusPanel({
  sourceBranch,
  targetBranch,
  commonAncestorCommit,
  hasConflicts,
  conflictCount,
}: MergeStatusPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
      {/* Top row: Branches & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-slate-500 font-medium">Merge Direction:</span>
          <div className="flex items-center gap-1.5 font-mono">
            <Badge variant="indigo" size="sm">
              ⑂ {sourceBranch.name}
            </Badge>
            <span className="text-slate-400 font-bold">&rarr;</span>
            <Badge variant="slate" size="sm">
              ⑂ {targetBranch.name}
            </Badge>
          </div>
        </div>

        <div>
          {hasConflicts ? (
            <Badge variant="rose" size="md">
              ⚠ {conflictCount} Conflict{conflictCount === 1 ? '' : 's'}
            </Badge>
          ) : (
            <Badge variant="teal" size="md">
              ✓ Clean Merge
            </Badge>
          )}
        </div>
      </div>

      {/* Ancestor Details */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <div className="flex items-center gap-2">
          <span>Common Ancestor:</span>
          <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-[11px]">
            {commonAncestorCommit?.id ? commonAncestorCommit.id.slice(0, 7) : 'root'}
          </span>
          <span className="truncate max-w-xs text-slate-600 dark:text-slate-300">
            {commonAncestorCommit?.message || 'Initial version'}
          </span>
        </div>

        <span className="text-[11px] text-slate-400">
          3-Way diff3 convergence
        </span>
      </div>
    </div>
  )
}
