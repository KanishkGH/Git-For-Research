'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { WorkspaceMemberWithUser } from '@/lib/db/workspaces'
import { addWorkspaceMemberAction, removeWorkspaceMemberAction } from '@/app/actions/members'

export function WorkspaceMembers({
  workspaceId,
  members,
  canManage,
}: {
  workspaceId: string
  members: WorkspaceMemberWithUser[]
  canManage: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await addWorkspaceMemberAction(workspaceId, email, role)
      if (!result.success) return setError(result.error)
      setEmail('')
      router.refresh()
    })
  }

  function removeMember(memberId: string) {
    setError('')
    startTransition(async () => {
      const result = await removeWorkspaceMemberAction(workspaceId, memberId)
      if (!result.success) return setError(result.error)
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">Researchers</h2>
      <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate">{member.users?.display_name || member.users?.email || member.user_id}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="capitalize text-slate-500">{member.role}</span>
              {canManage && member.role !== 'owner' && (
                <button type="button" disabled={isPending} onClick={() => removeMember(member.id)}
                  className="text-rose-600 disabled:opacity-50">Remove</button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {canManage && (
        <form onSubmit={addMember} className="mt-4 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="member-email">Researcher email</label>
          <input id="member-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)}
            placeholder="Researcher email" className="min-w-48 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <label className="sr-only" htmlFor="member-role">Role</label>
          <select id="member-role" value={role} onChange={(event) => setRole(event.target.value as 'editor' | 'viewer')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Add researcher
          </button>
        </form>
      )}
      {canManage && <p className="mt-2 text-xs text-slate-500">The researcher must sign up and sign in once before you add them.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    </section>
  )
}
