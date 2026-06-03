/**
 * sleepParser.js
 * Converts a Firestore sleep doc → component-ready data model.
 *
 * Timezone note: The Google Health API (via Fitbit) returns times in ISO-8601 with Z,
 * but the actual values are local wall-clock times (known Fitbit/Google Health quirk).
 * We therefore treat the Z-timestamp directly as local time display.
 */

const WINDOW_BASE_HOUR = 18 // Times before 18:00 are assumed to be next calendar day

/** Parse "HH:MM:SS" or "2026-05-29T22:32:00Z" → absolute minutes, cross-midnight aware */
function absMin(isoOrClock) {
  const m = isoOrClock.match(/T?(\d{2}):(\d{2}):?(\d{2})?/)
  if (!m) return 0
  let min = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0)
  if (min < WINDOW_BASE_HOUR * 60) min += 24 * 60 // after midnight → add one day
  return min
}

/** Extract "HH:MM" display clock from ISO string */
function toClock(isoString) {
  const m = isoString.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : '--:--'
}

/** Absolute minutes → "HH:MM" display */
function absMinToClock(absMinutes) {
  const h = Math.floor(absMinutes / 60) % 24
  const mn = Math.round(absMinutes % 60)
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`
}

export function fmtHM(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')} min`
}

export function fmtHMshort(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

/**
 * Main parser: Firestore doc → { SPAN, SEGMENTS, WAKES, STAGES, SUMMARY, axisTicks, date }
 */
export function parseSleepDoc(doc) {
  const { interval, summary, stages, date } = doc

  // Build dynamic window from actual stage times
  const allAbsMin = stages.flatMap(s => [absMin(s.startTime), absMin(s.endTime)])
  const minTime = Math.min(...allAbsMin)
  const maxTime = Math.max(...allAbsMin)

  // Pad and round to clean 30-min boundaries
  const windowStart = Math.floor((minTime - 15) / 30) * 30
  const windowEnd   = Math.ceil((maxTime + 30) / 30) * 30
  const SPAN = windowEnd - windowStart

  function toWindowMin(isoString) {
    return absMin(isoString) - windowStart
  }

  // Segments — lowercase types to match CSS classes and PH keys
  const SEGMENTS = stages.map(s => ({
    type:       s.type.toLowerCase(),           // 'awake' | 'light' | 'deep' | 'rem'
    startTime:  s.startTime,                    // ISO string — used as wakeNote Firestore key
    startClock: toClock(s.startTime),
    endClock:   toClock(s.endTime),
    start:      toWindowMin(s.startTime),       // minutes from window start
    end:        toWindowMin(s.endTime),
    dur:        absMin(s.endTime) - absMin(s.startTime),
  }))

  // Wake phases (all AWAKE segments), key = ISO startTime for Firestore
  const WAKES = SEGMENTS
    .filter(s => s.type === 'awake')
    .map(s => ({ ...s, key: s.startTime }))

  // Stage summary map
  const stageMap = {}
  summary.stagesSummary.forEach(s => { stageMap[s.type] = s })

  const STAGES = [
    { key: 'deep',  label: 'Tief',   min: stageMap.DEEP?.minutes  ?? 0, count: stageMap.DEEP?.count  ?? 0 },
    { key: 'light', label: 'Leicht', min: stageMap.LIGHT?.minutes ?? 0, count: stageMap.LIGHT?.count ?? 0 },
    { key: 'rem',   label: 'REM',    min: stageMap.REM?.minutes   ?? 0, count: stageMap.REM?.count   ?? 0 },
    { key: 'awake', label: 'Wach',   min: stageMap.AWAKE?.minutes ?? 0, count: stageMap.AWAKE?.count ?? 0 },
  ]

  // Time to fall asleep: use API value, or derive from first AWAKE stage
  const firstStage = stages[0]
  const fallAsleepMin = (summary.minutesToFallAsleep > 0)
    ? summary.minutesToFallAsleep
    : (firstStage.type === 'AWAKE'
        ? Math.round(absMin(firstStage.endTime) - absMin(firstStage.startTime))
        : 0)

  const efficiency = Math.floor((summary.minutesAsleep / summary.minutesInSleepPeriod) * 100)

  // Human-readable date label from local date
  const dateLabel = (() => {
    try {
      const [y, mo, d] = date.split('-').map(Number)
      return new Date(y, mo - 1, d).toLocaleDateString('de-AT', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    } catch { return date }
  })()

  // Axis ticks: every 2 hours within window
  const axisTicks = []
  const firstTick = Math.ceil(windowStart / 120) * 120
  for (let t = firstTick; t <= windowEnd; t += 120) {
    axisTicks.push({
      label: absMinToClock(t),
      pct:   ((t - windowStart) / SPAN) * 100,
    })
  }

  const SUMMARY = {
    dateLabel,
    startClock:    toClock(interval.startTime),
    endClock:      toClock(interval.endTime),
    inBedMin:      summary.minutesInSleepPeriod,
    asleepMin:     summary.minutesAsleep,
    awakeMin:      summary.minutesAwake,
    wakeCount:     stageMap.AWAKE?.count ?? 0,
    fallAsleepMin,
    efficiency,
  }

  return { SPAN, windowStart, SEGMENTS, WAKES, STAGES, SUMMARY, axisTicks, date }
}

/**
 * Compute 30-day phase averages from an array of Firestore docs.
 * Returns { deep, light, rem, awake } in minutes.
 */
export function compute30DayAvg(docs) {
  if (!docs || docs.length === 0) return { deep: 0, light: 0, rem: 0, awake: 0 }

  const sums = { DEEP: 0, LIGHT: 0, REM: 0, AWAKE: 0 }
  let count = 0

  for (const doc of docs) {
    if (!doc.summary?.stagesSummary) continue
    doc.summary.stagesSummary.forEach(s => {
      if (sums[s.type] !== undefined) sums[s.type] += s.minutes ?? 0
    })
    count++
  }

  if (count === 0) return { deep: 0, light: 0, rem: 0, awake: 0 }

  return {
    deep:  Math.round(sums.DEEP  / count),
    light: Math.round(sums.LIGHT / count),
    rem:   Math.round(sums.REM   / count),
    awake: Math.round(sums.AWAKE / count),
  }
}
