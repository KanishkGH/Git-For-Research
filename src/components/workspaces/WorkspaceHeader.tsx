import React from 'react'
import Link from 'next/link'
import type { WorkspaceRow } from '@/types/database'
import type { WorkspaceMemberWithUser } from '@/lib/db/workspaces'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export interface WorkspaceHeaderProps {
  workspace: WorkspaceRow
  members: WorkspaceMemberWithUser[]
  artifactCount: number
  onNewArtifact: () => void
  onImportArtifact: () => void
}

export function WorkspaceHeader({
  workspace,
  members,
  artifactCount,
  onNewArtifact,
  onImportArtifact,
}: WorkspaceHeaderProps) {
  const formattedDate = new Date(workspace.created_at).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )

  return (
    <div className="space-y-6 pb-6 border-b border-slate-200 dark:border-slate-800">
      {/* Back to Workspaces breadcrumb */}
      <div>
        <Link
          href="/"
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
          Back to Workspaces
        </Link>
      </div>

      {/* Main Workspace Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {workspace.name}
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {workspace.description || 'No description provided.'}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Created {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {artifactCount} {artifactCount === 1 ? 'artifact' : 'artifacts'}
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>

        {/* Header Action Group */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={onNewArtifact}>
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

          <Button variant="primary" size="sm" onClick={onImportArtifact}>
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

      {/* Workspace Team Members Section */}
      <div className="pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
          Research Team
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {members.map((member) => {
            const initials = member.users?.display_name
              ? member.users.display_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'U'

            return (
              <div
                key={member.id}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px] flex items-center justify-center">
                  {initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-tight">
                    {member.users?.display_name || member.user_id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {member.users?.email || ''}
                  </span>
                </div>
                <Badge variant={member.role} size="sm" className="ml-1">
                  {member.role}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
