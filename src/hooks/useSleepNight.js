import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { parseSleepDoc, compute30DayAvg } from '../lib/sleepParser'

/**
 * Fetches the last 30 sleep nights from Firestore.
 * Returns { loading, error, nights, avg30 }
 * - nights: array of parseSleepDoc() results, newest first
 * - avg30:  { deep, light, rem, awake } averages in minutes
 */
export function useSleepNight() {
  const [state, setState] = useState({ loading: true, error: null, nights: [], avg30: null })

  useEffect(() => {
    async function load() {
      try {
        const sleepCol = collection(db, 'health', 'main', 'sleep')
        const q = query(sleepCol, orderBy('date', 'desc'), limit(30))
        const snap = await getDocs(q)

        if (snap.empty) {
          setState({ loading: false, error: null, nights: [], avg30: null })
          return
        }

        const docs  = snap.docs.map(d => d.data())
        const nights = docs.map(d => parseSleepDoc(d))
        const avg30  = compute30DayAvg(docs)

        setState({ loading: false, error: null, nights, avg30 })
      } catch (err) {
        console.error('useSleepNight:', err)
        setState({ loading: false, error: err.message, nights: [], avg30: null })
      }
    }
    load()
  }, [])

  return state
}
