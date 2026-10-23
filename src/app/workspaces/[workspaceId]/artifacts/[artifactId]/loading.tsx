import React from 'react'

export default function ArtifactDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
        <div className="h-4 w-72 bg-slate-200 dark:bg-slate-800 rounded-md" />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editor Skeleton */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 min-h-[500px] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>

        {/* Right Column: History Sidebar Skeleton */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md mb-4" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
