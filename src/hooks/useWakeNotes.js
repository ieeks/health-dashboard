import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Reads and writes wakeNotes for a given sleep date.
 * Key = ISO startTime of AWAKE stage (stable, collision-free).
 *
 * Returns { notes, saveNote, saving }
 * - notes: { [stageStartTime]: string }
 * - saveNote(key, text): writes to Firestore + updates local state
 */
export function useWakeNotes(date) {
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!date) return
    async function loadNotes() {
      try {
        const notesCol = collection(db, 'health', 'main', 'sleep', date, 'wakeNotes')
        const snap = await getDocs(notesCol)
        const loaded = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data().text ?? '' })
        setNotes(loaded)
      } catch (err) {
        console.error('useWakeNotes load:', err)
      }
    }
    loadNotes()
  }, [date])

  const saveNote = useCallback(async (key, text) => {
    if (!date) return
    setSaving(true)
    // Optimistic update
    setNotes(prev => ({ ...prev, [key]: text }))
    try {
      const noteRef = doc(db, 'health', 'main', 'sleep', date, 'wakeNotes', key)
      await setDoc(noteRef, {
        text,
        updatedAt: new Date().toISOString(),
      }, { merge: true })
    } catch (err) {
      console.error('useWakeNotes save:', err)
      // Revert on error
      setNotes(prev => { const n = { ...prev }; delete n[key]; return n })
    } finally {
      setSaving(false)
    }
  }, [date])

  return { notes, saveNote, saving }
}
