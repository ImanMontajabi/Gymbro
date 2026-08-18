import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'

const QUEUE_STORAGE_KEY = 'gymbro_mutation_queue'

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage unavailable (private mode, quota) — the queue still
    // works for this tab session, it just won't survive a reload.
  }
}

// Replays one queued mutation against Supabase. `match` is always a single
// `.eq(column, value)` filter — every write in this app targets one row by
// id, so a richer filter shape isn't needed.
async function runSupabaseMutation({ table, type, payload, match }) {
  const query = supabase.from(table)
  if (type === 'insert') return query.insert(payload)
  if (type === 'update') return query.update(payload).eq(match.column, match.value)
  if (type === 'delete') return query.delete().eq(match.column, match.value)
  throw new Error(`Unknown mutation type: ${type}`)
}

// Offline-first write queue: `writeMutation` tries the Supabase call
// immediately, and only falls back to queuing in localStorage when the
// device is actually offline (or the request fails at the network level —
// e.g. the connection drops mid-request even though `navigator.onLine`
// hadn't flipped yet). A genuine Supabase error (RLS, constraint, etc.) is
// NOT queued, since retrying it later would just fail the same way — it's
// returned to the caller exactly like a normal Supabase error today.
//
// Queued mutations are flushed sequentially — in the order they were
// created — whenever the browser fires `online`, and once more on mount in
// case the tab was reloaded while offline with items still pending. Each
// successful item is persisted immediately so a mid-sync refresh/crash
// can't replay an already-applied mutation.
export function useMutationQueue() {
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length)
  const [isSyncing, setIsSyncing] = useState(false)
  const isFlushingRef = useRef(false)

  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current) return
    let queue = loadQueue()
    if (queue.length === 0) return

    isFlushingRef.current = true
    setIsSyncing(true)

    while (queue.length > 0 && navigator.onLine) {
      const { error } = await runSupabaseMutation(queue[0])
      if (error) {
        console.error(error)
        toast.error('همگام‌سازی اطلاعات ناموفق بود')
        break // stop here — keep this + later items queued, retry next time we're online
      }
      queue = queue.slice(1)
      saveQueue(queue)
      setPendingCount(queue.length)
    }

    isFlushingRef.current = false
    setIsSyncing(false)

    if (queue.length === 0) {
      toast.success('اطلاعات با موفقیت همگام‌سازی شد')
    }
  }, [])

  useEffect(() => {
    if (navigator.onLine) flushQueue()
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [flushQueue])

  const writeMutation = useCallback(async ({ table, type, payload, match }) => {
    const mutation = { table, type, payload, match }

    const queueAndNotify = () => {
      const queue = [...loadQueue(), mutation]
      saveQueue(queue)
      setPendingCount(queue.length)
      toast('شما آفلاین هستید. اطلاعات محلی ذخیره شد.', { icon: '📶' })
    }

    if (!navigator.onLine) {
      queueAndNotify()
      return { error: null, queued: true }
    }

    try {
      const { error } = await runSupabaseMutation(mutation)
      return { error: error ?? null, queued: false }
    } catch {
      // The fetch itself threw — connectivity most likely dropped mid-
      // request. Queue instead of silently losing the write.
      queueAndNotify()
      return { error: null, queued: true }
    }
  }, [])

  return { writeMutation, pendingCount, isSyncing }
}
