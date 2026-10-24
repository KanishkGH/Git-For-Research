'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { ensureCollaborationSeedAction } from '@/app/actions/collaboration'
import { createClient } from '@/lib/supabase/client'
import type { CollaborationUpdateRow } from '@/types/database'

export interface CollaboratorPresence {
  userId: string
  displayName: string
  status: 'viewing' | 'editing'
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let start = 0; start < bytes.length; start += 32768) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 32768))
  }
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

export function useCollaborativeText({
  workspaceId,
  artifactId,
  branchId,
  userId,
  displayName,
  canEdit,
}: {
  workspaceId: string
  artifactId: string
  branchId: string
  userId: string
  displayName: string
  canEdit: boolean
}) {
  const [content, setContent] = useState('')
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Connecting live editor…')
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([])
  const textRef = useRef<Y.Text | null>(null)
  const trackRef = useRef<((status: 'viewing' | 'editing') => void) | null>(null)

  useEffect(() => {
    let closed = false
    let flushing = false
    let flushTimer: ReturnType<typeof setTimeout> | null = null
    const pending: Uint8Array[] = []
    const seenRows = new Set<number>()
    const supabase = createClient()
    const doc = new Y.Doc()
    const text = doc.getText('content')
    textRef.current = text
    setReady(false)
    setContent('')
    setStatus('Connecting live editor…')
    setCollaborators([])

    const channel = supabase.channel(`workspace:${workspaceId}:branch:${branchId}`, {
      config: { private: true },
    })

    const applyRow = (row: CollaborationUpdateRow) => {
      if (seenRows.has(row.id)) return
      try {
        Y.applyUpdate(doc, fromBase64(row.update_base64), 'remote')
        seenRows.add(row.id)
      } catch {
        setStatus('Could not read a live update. Refresh this page.')
      }
    }

    const scheduleFlush = () => {
      if (flushTimer) clearTimeout(flushTimer)
      flushTimer = setTimeout(() => { void flush() }, 250)
    }

    const flush = async () => {
      if (flushing || pending.length === 0 || closed) return
      flushing = true
      const updates = pending.splice(0)
      const merged = Y.mergeUpdates(updates)
      const { error } = await supabase.from('collaboration_updates').insert({
        workspace_id: workspaceId,
        artifact_id: artifactId,
        branch_id: branchId,
        update_base64: toBase64(merged),
        created_by: userId,
      })
      flushing = false
      if (error) {
        pending.unshift(...updates)
        setStatus(`Saving live changes failed: ${error.message}`)
        if (!closed) flushTimer = setTimeout(() => { void flush() }, 2000)
      } else if (!closed) {
        setStatus('Live · changes saved')
        if (pending.length) scheduleFlush()
      }
    }

    const onTextChange = () => setContent(text.toString())
    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || !canEdit) return
      pending.push(update)
      setStatus('Saving live changes…')
      scheduleFlush()
    }
    text.observe(onTextChange)
    doc.on('update', onDocUpdate)

    const updatePresence = (presenceStatus: 'viewing' | 'editing') => {
      void channel.track({ userId, displayName, status: presenceStatus })
    }
    trackRef.current = updatePresence

    const loadUpdates = async () => {
      for (let offset = 0; !closed; offset += 500) {
        const { data, error } = await supabase.from('collaboration_updates')
          .select('*')
          .eq('branch_id', branchId)
          .order('id', { ascending: true })
          .range(offset, offset + 499)
        if (error) throw new Error(error.message)
        for (const row of data ?? []) applyRow(row)
        if (!data || data.length < 500) return
      }
    }

    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'collaboration_updates',
      filter: `branch_id=eq.${branchId}`,
    }, (payload) => {
      const row = payload.new as CollaborationUpdateRow
      if (typeof row.update_base64 === 'string') {
        applyRow(row)
      } else if (Number.isSafeInteger(Number(row.id))) {
        // Supabase truncates large Postgres Changes payloads. Load that row directly.
        void supabase.from('collaboration_updates').select('*').eq('id', row.id)
          .single().then(({ data, error }) => {
            if (data) applyRow(data)
            else if (error) setStatus(`Could not load live update: ${error.message}`)
          })
      }
    })
    channel.on('presence', { event: 'sync' }, () => {
      const present = Object.values(channel.presenceState()).flat() as unknown as CollaboratorPresence[]
      setCollaborators(present.filter((person) => person.userId && person.displayName))
    })

    const connect = async () => {
      const seed = await ensureCollaborationSeedAction(workspaceId, artifactId, branchId)
      if (closed) return
      if (!seed.success) {
        setStatus(seed.error)
        return
      }
      channel.subscribe(async (subscriptionStatus) => {
        if (closed) return
        if (subscriptionStatus === 'SUBSCRIBED') {
          try {
            updatePresence('viewing')
            await loadUpdates()
            if (!closed) {
              setReady(true)
              setStatus('Live · changes saved')
            }
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Could not load live edits.')
          }
        } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
          setStatus('Live connection lost. Reconnecting…')
          setReady(false)
        }
      })
    }
    void connect()

    return () => {
      closed = true
      if (flushTimer) clearTimeout(flushTimer)
      if (pending.length) {
        const remaining = Y.mergeUpdates(pending)
        void supabase.from('collaboration_updates').insert({
          workspace_id: workspaceId,
          artifact_id: artifactId,
          branch_id: branchId,
          update_base64: toBase64(remaining),
          created_by: userId,
        })
      }
      trackRef.current = null
      textRef.current = null
      text.unobserve(onTextChange)
      doc.off('update', onDocUpdate)
      void supabase.removeChannel(channel)
      doc.destroy()
    }
  }, [workspaceId, artifactId, branchId, userId, displayName, canEdit])

  const replaceText = useCallback((next: string) => {
    const text = textRef.current
    if (!text || !ready || !canEdit) return
    const previous = text.toString()
    let prefix = 0
    while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix++
    let suffix = 0
    while (
      suffix < previous.length - prefix && suffix < next.length - prefix &&
      previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
    ) suffix++
    text.doc?.transact(() => {
      text.delete(prefix, previous.length - prefix - suffix)
      text.insert(prefix, next.slice(prefix, next.length - suffix))
    })
  }, [ready, canEdit])

  return {
    content,
    ready,
    status,
    collaborators,
    replaceText,
    setPresenceStatus: (value: 'viewing' | 'editing') => trackRef.current?.(value),
  }
}
