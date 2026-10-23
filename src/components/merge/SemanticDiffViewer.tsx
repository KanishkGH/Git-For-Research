import React from 'react'
import type { DiffChunk } from '@/lib/diff/semantic-diff'

export interface SemanticDiffViewerProps {
  diffChunks: DiffChunk[]
  sourceBranchName: string
  targetBranchName: string
}

export function SemanticDiffViewer({
  diffChunks,
  sourceBranchName,
  targetBranchName,
}: SemanticDiffViewerProps) {
  const additions = diffChunks.filter((c) => c.type === 'addition').length
  const deletions = diffChunks.filter((c) => c.type === 'deletion').length
  const unchanged = diffChunks.filter((c) => c.type === 'unchanged').length

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Diff Summary Bar */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Semantic Changes:
          </span>
          <span className="text-slate-500">
            Comparing <strong className="font-mono text-slate-700 dark:text-slate-200">{targetBranchName}</strong> &larr; <strong className="font-mono text-indigo-600 dark:text-indigo-400">{sourceBranchName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono font-medium">
          <span className="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-900/60">
            +{additions} addition{additions === 1 ? '' : 's'}
          </span>
          <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
            -{deletions} deletion{deletions === 1 ? '' : 's'}
          </span>
          <span className="text-slate-400">
            {unchanged} unchanged block{unchanged === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Diff Content View */}
      <div className="p-4 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto space-y-1">
        {diffChunks.map((chunk, idx) => {
          if (chunk.type === 'addition') {
            return (
              <div
                key={idx}
                className="bg-emerald-50 dark:bg-emerald-950/40 border-l-3 border-emerald-500 text-emerald-900 dark:text-emerald-200 p-2 rounded-r"
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold select-none">+</span>
                  <pre className="font-mono whitespace-pre-wrap flex-1">{chunk.content}</pre>
                </div>
              </div>
            )
          }

          if (chunk.type === 'deletion') {
            return (
              <div
                key={idx}
                className="bg-rose-50 dark:bg-rose-950/40 border-l-3 border-rose-500 text-rose-900 dark:text-rose-200 p-2 rounded-r opacity-90"
              >
                <div className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold select-none">-</span>
                  <pre className="font-mono whitespace-pre-wrap flex-1 line-through">{chunk.content}</pre>
                </div>
              </div>
            )
          }

          return (
            <div
              key={idx}
              className="text-slate-700 dark:text-slate-300 p-1.5 pl-3 border-l-3 border-transparent"
            >
              <pre className="font-mono whitespace-pre-wrap">{chunk.content}</pre>
            </div>
          )
        })}
      </div>
    </div>
  )
}
