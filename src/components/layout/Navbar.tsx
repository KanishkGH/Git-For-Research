import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/actions/auth'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1"
          >
            {/* Git Branch Icon */}
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition-colors">
              <svg
                className="w-4 h-4"
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
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Git for Research
              </span>
            </div>
          </Link>
        </div>

        {user && <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-full py-1.5 px-3">
            {/* Avatar Placeholder */}
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center">
              SC
            </div>
            {/* User Details */}
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-200 leading-none">
                {user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {user.email}
              </span>
            </div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-300">Sign out</button>
          </form>
        </div>}
      </div>
    </header>
  )
}
