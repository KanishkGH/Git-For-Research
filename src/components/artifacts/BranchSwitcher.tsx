'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { BranchRow } from '@/types/database'
import { Badge } from '@/components/ui/Badge'

export interface BranchSwitcherProps {
  branches: BranchRow[]
  activeBranchId: string
  onSelectBranch: (branchId: string) => void
  onOpenCreateBranch: () => void
}

export function BranchSwitcher({
  branches,
  activeBranchId,
  onSelectBranch,
  onOpenCreateBranch,
}: BranchSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-colors cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Branch Icon */}
        <svg
          className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>

        <span className="truncate max-w-[140px]">
          {activeBranch?.name || 'main'}
        </span>

        {activeBranch?.is_default && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-normal">
            default
          </span>
        )}

        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
            Artifact Branches ({branches.length})
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-800/50">
            {branches.map((branch) => {
              const isSelected = branch.id === activeBranchId

              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    onSelectBranch(branch.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400'
                      }`}
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
                    <span className="truncate font-mono">{branch.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {branch.is_default && (
                      <Badge variant="slate" size="sm" className="text-[10px]">
                        default
                      </Badge>
                    )}
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 px-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onOpenCreateBranch()
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Branch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
