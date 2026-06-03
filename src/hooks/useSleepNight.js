import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { parseSleepDoc, compute30DayAvg } from '../lib/sleepParser'

/**
 * Fetches the latest sleep night + 30-day context from Firestore.
 * Returns { loading, error, night, avg30 }
 * - night: parseSleepDoc() result for most recent night
 * - avg30: { deep, light, rem, awake } averages in minutes
 */
export function useSleepNight() {
  const [state, setState] = useState({ loading: true, error: null, night: null, avg30: null })

  useEffect(() => {
    async function load() {
      try {
        const sleepCol = collection(db, 'health', 'main', 'sleep')
        const q = query(sleepCol, orderBy('date', 'desc'), limit(30))
        const snap = await getDocs(q)

        if (snap.empty) {
          setState({ loading: false, error: null, night: null, avg30: null })
          return
        }

        const docs = snap.docs.map(d => d.data())
        const latest = docs[0]

        const night = parseSleepDoc(latest)
        const avg30 = compute30DayAvg(docs)

        setState({ loading: false, error: null, night, avg30 })
      } catch (err) {
        console.error('useSleepNight:', err)
        setState({ loading: false, error: err.message, night: null, avg30: null })
      }
    }
    load()
  }, [])

  return state
}
