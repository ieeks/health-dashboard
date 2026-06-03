import { useState, useEffect } from 'react'

/** Two-frame delay reveal — triggers CSS transitions after mount */
export function useReveal() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}
