import React from 'react'
import type { CommitRow } from '@/types/database'
import { Badge } from '@/components/ui/Badge'

export interface CommitHistoryListProps {
  commits: CommitRow[]
  activeHeadCommitId: string | null
  selectedCommitId: string | null
  onSelectCommit: (commit: CommitRow) => void
  onBranchFromCommit: (commit: CommitRow) => void
}

export function CommitHistoryList({
  commits,
  activeHeadCommitId,
  selectedCommitId,
  onSelectCommit,
  onBranchFromCommit,
}: CommitHistoryListProps) {
  if (commits.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        No commit history available for this branch.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Commit Timeline ({commits.length})
        </h3>
        <span className="text-[11px] text-slate-400">
          Ancestors via <code className="font-mono text-[10px]">parent_commit_id</code>
        </span>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {commits.map((commit) => {
          const isHead = commit.id === activeHeadCommitId
          const isSelected = commit.id === selectedCommitId
          const shortHash = commit.id.slice(0, 7)
          const formattedDate = new Date(commit.created_at).toLocaleString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }
          )

          return (
            <div key={commit.id} className="relative group">
              {/* Timeline Node Icon */}
              <div
                className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  isHead
                    ? 'bg-indigo-600 border-indigo-200 dark:border-indigo-900 ring-2 ring-indigo-500/20'
                    : isSelected
                    ? 'bg-amber-500 border-amber-200 dark:border-amber-900 ring-2 ring-amber-500/20'
                    : commit.is_merge_commit
                    ? 'bg-purple-600 border-purple-200 dark:border-purple-900 ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-400 group-hover:border-indigo-500'
                }`}
              />

              {/* Commit Entry Card */}
              <div
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-50/50 dark:bg-slate-850/50 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header: Hash, Badges, Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-750 px-1.5 py-0.5 rounded">
                      {shortHash}
                    </span>
                    {isHead && (
                      <Badge variant="indigo" size="sm" className="text-[10px]">
                        HEAD
                      </Badge>
                    )}
                    {commit.is_merge_commit && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Merge
                      </span>
                    )}
                    {isSelected && !isHead && (
                      <Badge variant="amber" size="sm" className="text-[10px]">
                        Viewing
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{formattedDate}</span>
                </div>

                {/* Commit Message */}
                <p className="font-medium text-slate-900 dark:text-slate-100 text-xs my-1.5">
                  {commit.message}
                </p>

                {/* Merge Parent Attribution */}
                {commit.is_merge_commit && commit.parent_commit_id && commit.merge_parent_id && (
                  <div className="mb-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>Parents:</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                      {commit.parent_commit_id.slice(0, 7)}
                    </span>
                    <span>+</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                      {commit.merge_parent_id.slice(0, 7)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onSelectCommit(commit)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                  >
                    {isSelected ? 'Currently Viewing' : 'Inspect Snapshot'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onBranchFromCommit(commit)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
                    title="Fork a new branch from this exact historical commit"
                  >
                    <svg
                      className="w-3 h-3 text-indigo-500"
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
                    Branch here
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
