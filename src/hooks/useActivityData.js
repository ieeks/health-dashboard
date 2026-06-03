import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Fetches the most recent daily activity document from
 * health/main/daily/{date} in Firestore.
 *
 * Returns { loading, error, daily } where daily may be null
 * if no data has been synced yet.
 */
export function useActivityData() {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [daily, setDaily]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const col = collection(db, 'health', 'main', 'daily')
        const q   = query(col, orderBy('date', 'desc'), limit(1))
        const snap = await getDocs(q)

        if (cancelled) return

        if (!snap.empty) {
          setDaily(snap.docs[0].data())
        } else {
          setDaily(null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { loading, error, daily }
}
