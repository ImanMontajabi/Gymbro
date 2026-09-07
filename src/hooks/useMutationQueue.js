import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import { loadStoredWorkout } from '../utils/activeWorkoutStorage'

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
  if (type === 'upsert') return query.upsert(payload)
  if (type === 'update') return query.update(payload).eq(match.column, match.value)
  if (type === 'delete') return query.delete().eq(match.column, match.value)
  throw new Error(`Unknown mutation type: ${type}`)
}

// A queued INSERT of an *active* session is only valid while that session
// is still this device's in-progress workout (i.e. it is what the crash
// cache holds). Once the workout was finished or cancelled, the insert is
// a leftover — replaying it would recreate the session as active on the
// server: the "zombie workout" that came back on every app boot. Finish/
// cancel now purge their own session's writes, but this guard also covers
// queues that were filled before that fix.
function isStaleActiveSessionInsert(mutation) {
  if (mutation.table !== 'sessions' || mutation.type !== 'insert') return false
  if (mutation.payload?.status !== 'active') return false
  return mutation.payload?.id !== loadStoredWorkout()?.activeSession?.id
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
// processed item is persisted immediately so a mid-sync refresh/crash
// can't replay an already-applied mutation.
//
// During a flush, a Supabase error (constraint, RLS, bad column) DROPS the
// item and moves on: it would fail identically on every future boot, and
// leaving it at the head used to block everything behind it forever. Only
// a thrown fetch (connectivity lost mid-flush) stops the flush and keeps
// the item for the next attempt.
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

    let failed = 0
    try {
      while (queue.length > 0 && navigator.onLine) {
        const mutation = queue[0]
        if (isStaleActiveSessionInsert(mutation)) {
          console.info('Dropping stale active-session insert', mutation.payload?.id)
        } else {
          const { error } = await runSupabaseMutation(mutation)
          if (error) {
            console.error(error)
            failed += 1
          }
        }
        queue = queue.slice(1)
        saveQueue(queue)
        setPendingCount(queue.length)
      }
    } catch (err) {
      // Connectivity dropped mid-flush: keep the current item, retry on the
      // next `online` event. Previously a throw here left isFlushingRef
      // stuck at true, so the queue never flushed again in that tab.
      console.error(err)
    } finally {
      isFlushingRef.current = false
      setIsSyncing(false)
    }

    if (failed > 0) {
      toast.error('همگام‌سازی اطلاعات ناموفق بود')
    } else if (queue.length === 0) {
      toast.success('اطلاعات با موفقیت همگام‌سازی شد')
    }
  }, [])

  // Removes every queued write aimed at one session — its insert (matched
  // by payload id) and its updates/deletes (matched by the `.eq('id')`
  // filter). Called by finish/cancel, whose own write carries the final
  // state, so nothing older for that session should ever replay.
  const dropQueuedSessionMutations = useCallback((sessionId) => {
    const queue = loadQueue().filter(
      (m) =>
        m.table !== 'sessions' ||
        (m.payload?.id !== sessionId && m.match?.value !== sessionId)
    )
    saveQueue(queue)
    setPendingCount(queue.length)
  }, [])

  // "Clear all data": nothing pending may replay after the server-side wipe.
  const clearQueue = useCallback(() => {
    saveQueue([])
    setPendingCount(0)
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

  return { writeMutation, dropQueuedSessionMutations, clearQueue, pendingCount, isSyncing }
}
