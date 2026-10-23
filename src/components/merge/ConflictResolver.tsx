'use client'

import React, { useState, useEffect } from 'react'
import type { MergeConflict } from '@/lib/diff/semantic-diff'
import { hasUnresolvedConflictMarkers } from '@/lib/diff/semantic-diff'
import { Button } from '@/components/ui/Button'

export interface ConflictResolverProps {
  conflicts: MergeConflict[]
  initialMergedContent: string
  sourceBranchName: string
  targetBranchName: string
  onContentChange: (content: string, isClean: boolean) => void
}

export function ConflictResolver({
  conflicts,
  initialMergedContent,
  sourceBranchName,
  targetBranchName,
  onContentChange,
}: ConflictResolverProps) {
  const [content, setContent] = useState(initialMergedContent)

  const hasRemainingMarkers = hasUnresolvedConflictMarkers(content)

  useEffect(() => {
    onContentChange(content, !hasRemainingMarkers)
  }, [content, hasRemainingMarkers, onContentChange])

  // Helper to replace a specific conflict hunk in the live text
  const resolveSingleConflict = (
    conflict: MergeConflict,
    choice: 'target' | 'source' | 'both'
  ) => {
    const startMarker = `<<<<<<< TARGET (Current Branch)\n${conflict.targetContent}\n=======\n${conflict.sourceContent}\n>>>>>>> SOURCE (Incoming Branch)`

    let replacement = ''
    if (choice === 'target') {
      replacement = conflict.targetContent
    } else if (choice === 'source') {
      replacement = conflict.sourceContent
    } else if (choice === 'both') {
      replacement = `${conflict.targetContent}\n\n${conflict.sourceContent}`
    }

    if (content.includes(startMarker)) {
      const updated = content.replace(startMarker, replacement)
      setContent(updated)
    } else {
      // Fallback: try relaxed line replacement
      const simpleMarker = `<<<<<<< TARGET (Current Branch)`
      if (content.includes(simpleMarker)) {
        // Replace first occurrence of conflict block
        const regex = /<<<<<<< TARGET \(Current Branch\)[\s\S]*?>>>>>>> SOURCE \(Incoming Branch\)/
        const updated = content.replace(regex, replacement)
        setContent(updated)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Conflict Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
          hasRemainingMarkers
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              hasRemainingMarkers
                ? 'bg-amber-200 text-amber-900'
                : 'bg-emerald-200 text-emerald-900'
            }`}
          >
            {hasRemainingMarkers ? '!' : '✓'}
          </div>
          <div>
            <h4 className="font-semibold text-sm">
              {hasRemainingMarkers
                ? `${conflicts.length} Conflict Region${conflicts.length === 1 ? '' : 's'} Detected`
                : 'All Conflicts Resolved!'}
            </h4>
            <p className="text-[11px] opacity-90">
              {hasRemainingMarkers
                ? 'Use the quick action buttons below or edit the resolved document manually to remove all conflict markers.'
                : 'The document is clean and ready to be committed as a merge commit.'}
            </p>
          </div>
        </div>

        <div className="font-mono text-[11px] shrink-0 font-semibold">
          {hasRemainingMarkers ? (
            <span className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-1 rounded">
              Unresolved Markers
            </span>
          ) : (
            <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-1 rounded">
              Ready to Merge
            </span>
          )}
        </div>
      </div>

      {/* Conflict Quick-Resolution Cards */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Conflict Quick Actions
          </h4>

          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Conflict #{conflict.index}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resolveSingleConflict(conflict, 'target')}
                    className="text-[11px] h-7 px-2"
                  >
                    Accept Current ({targetBranchName})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resolveSingleConflict(conflict, 'source')}
                    className="text-[11px] h-7 px-2 text-indigo-600 dark:text-indigo-400"
                  >
                    Accept Incoming ({sourceBranchName})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveSingleConflict(conflict, 'both')}
                    className="text-[11px] h-7 px-2"
                  >
                    Accept Both
                  </Button>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-750">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Current: {targetBranchName}
                  </span>
                  <pre className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {conflict.targetContent || '(empty)'}
                  </pre>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/60">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                    Incoming: {sourceBranchName}
                  </span>
                  <pre className="whitespace-pre-wrap text-indigo-950 dark:text-indigo-200">
                    {conflict.sourceContent || '(empty)'}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Merged Document Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="resolved-document-canvas"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Resolved Document Editor
          </label>
          <span className="text-[11px] text-slate-400">
            Edit text directly to ensure seamless flow
          </span>
        </div>
        <textarea
          id="resolved-document-canvas"
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-4 font-mono text-xs leading-relaxed rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y shadow-xs"
        />
      </div>
    </div>
  )
}
