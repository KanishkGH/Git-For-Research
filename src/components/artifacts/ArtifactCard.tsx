import React from 'react'
import Link from 'next/link'
import type { ArtifactRow } from '@/types/database'
import { Badge } from '@/components/ui/Badge'

export interface ArtifactCardProps {
  artifact: ArtifactRow
}

const ARTIFACT_TYPE_LABELS: Record<ArtifactRow['artifact_type'], string> = {
  markdown: 'Markdown Document',
  pdf: 'PDF Document',
  chatgpt_export: 'ChatGPT Export',
  claude_export: 'Claude Export',
  codebase: 'Codebase',
}

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const formattedDate = new Date(artifact.created_at).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )

  return (
    <Link
      href={`/workspaces/${artifact.workspace_id}/artifacts/${artifact.id}`}
      className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div>
        {/* Top bar: Type badge & Created date */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant={artifact.artifact_type} size="sm">
            {ARTIFACT_TYPE_LABELS[artifact.artifact_type] || artifact.artifact_type}
          </Badge>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {formattedDate}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {artifact.name}
        </h4>

        {/* Original filename if present */}
        {artifact.original_filename && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5 text-slate-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            <span className="truncate">{artifact.original_filename}</span>
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
          Open Artifact &rarr;
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          v1.0 (Initial)
        </span>
      </div>
    </Link>
  )
}
