import React from 'react'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
