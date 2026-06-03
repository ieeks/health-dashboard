import { useState, useRef } from 'react'

function ChevronRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  )
}

function WakeItem({ wake, note, onSave }) {
  const [open, setOpen] = useState(false)
  const textareaRef = useRef(null)

  function toggle() {
    setOpen(o => !o)
    if (!open) {
      // Focus textarea after expand animation
      setTimeout(() => textareaRef.current?.focus(), 120)
    }
  }

  function handleSave(e) {
    e.stopPropagation()
    const text = textareaRef.current?.value.trim() ?? ''
    onSave(wake.key, text)
    setOpen(false)
  }

  function handleCancel(e) {
    e.stopPropagation()
    setOpen(false)
  }

  const hasNote = !!note

  return (
    <>
      <div className="witem" onClick={toggle}>
        <div className="tick"><i /></div>
        <div className="meta">
          <div className="time">
            {wake.startClock}
            <span className="dur">{Math.round(wake.dur)} min</span>
          </div>
          <div className={`note${hasNote ? ' has' : ''}`}>
            {hasNote ? note : 'keine Notiz hinterlegt'}
          </div>
        </div>
        <div className={`cta${hasNote ? '' : ' add'}`}>
          {hasNote ? (<>bearbeiten <ChevronRight /></>) : '+ Notiz'}
        </div>
      </div>

      <div className={`winline${open ? ' open' : ''}`}>
        <textarea
          ref={textareaRef}
          defaultValue={note ?? ''}
          placeholder="Was war los? z. B. Kind geweint, Toilette, wach gelegen…"
        />
        <div className="row">
          <button className="btn ghost" onClick={handleCancel}>Abbrechen</button>
          <button className="btn primary" onClick={handleSave}>Speichern</button>
        </div>
      </div>
    </>
  )
}

export function WakeList({ wakes, notes, onSave }) {
  if (!wakes.length) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '4px 0' }}>
        Keine Wachphasen aufgezeichnet.
      </div>
    )
  }

  return (
    <div className="wlist">
      {wakes.map(wake => (
        <WakeItem
          key={wake.key}
          wake={wake}
          note={notes[wake.key] ?? ''}
          onSave={onSave}
        />
      ))}
    </div>
  )
}
