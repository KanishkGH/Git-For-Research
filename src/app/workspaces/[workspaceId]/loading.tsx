import React from 'react'

export default function WorkspaceDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2.5 max-w-2xl">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="flex gap-4 pt-1">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
        </div>

        {/* Team Members Skeleton */}
        <div className="pt-2 space-y-2">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="flex gap-2">
            <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Artifacts Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
