import React from 'react'
import Link from 'next/link'
import type { WorkspaceRow } from '@/types/database'

export interface WorkspaceCardProps {
  workspace: WorkspaceRow
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const formattedDate = new Date(workspace.created_at).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )

  return (
    <Link
      href={`/workspaces/${workspace.id}`}
      className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div>
        {/* Card Header & Icon */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {formattedDate}
          </span>
        </div>

        {/* Workspace Title */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {workspace.name}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {workspace.description || 'No description provided.'}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
          Open Workspace
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </div>
    </Link>
  )
}
