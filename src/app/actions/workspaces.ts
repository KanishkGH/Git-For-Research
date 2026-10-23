'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { createWorkspace } from '@/lib/db/workspaces'
import type { WorkspaceRow } from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server action to create a new research workspace.
 * Resolves the active demo researcher, validates input, calls the typed data access layer,
 * and revalidates the dashboard route.
 */
export async function createWorkspaceAction(
  formData: FormData
): Promise<ActionResult<WorkspaceRow>> {
  try {
    // 1. Resolve demo researcher identity
    const user = await getCurrentDemoUser()

    // 2. Extract and sanitize form values
    const rawName = formData.get('name')
    const rawDescription = formData.get('description')

    const name = typeof rawName === 'string' ? rawName.trim() : ''
    const description =
      typeof rawDescription === 'string' && rawDescription.trim()
        ? rawDescription.trim()
        : null

    // 3. Server-side validation
    if (!name) {
      return { success: false, error: 'Workspace name is required.' }
    }

    if (name.length > 100) {
      return {
        success: false,
        error: 'Workspace name must not exceed 100 characters.',
      }
    }

    if (description && description.length > 500) {
      return {
        success: false,
        error: 'Workspace description must not exceed 500 characters.',
      }
    }

    // 4. Create workspace (creator is automatically added as owner by createWorkspace)
    const workspace = await createWorkspace({
      name,
      description,
      owner_id: user.id,
    })

    // 5. Revalidate dashboard path
    revalidatePath('/')

    return {
      success: true,
      data: workspace,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while creating the workspace.',
    }
  }
}
