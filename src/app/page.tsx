import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { listUserWorkspaces } from '@/lib/db/workspaces'
import { WorkspaceList } from '@/components/workspaces/WorkspaceList'
import type { WorkspaceRow } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let workspaces: WorkspaceRow[] = []
  let errorMessage: string | null = null

  try {
    // 1. Resolve demo researcher identity
    const user = await getCurrentDemoUser()

    // 2. Fetch all workspaces the user belongs to
    workspaces = await listUserWorkspaces(user.id)
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load research workspaces.'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {errorMessage ? (
        <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
          <h2 className="text-base font-semibold">Unable to load workspaces</h2>
          <p className="mt-1 text-xs">{errorMessage}</p>
        </div>
      ) : (
        <WorkspaceList workspaces={workspaces} />
      )}
    </div>
  )
}
