/**
 * Health Sync Script
 * Fetches sleep + activity data from Google Health API → filters FITBIT → upserts to Firestore
 *
 * Sleep:    health/main/sleep/{date}
 * Activity: health/main/daily/{date}
 *
 * ENV (GitHub Secrets / .env.local):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_SERVICE_ACCOUNT_JSON  ← JSON string of service account
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Firebase Admin Init ──────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// ── Constants ────────────────────────────────────────────────────────────────

const TOKEN_URL  = 'https://oauth2.googleapis.com/token'
const HEALTH_BASE = 'https://health.googleapis.com/v4/users/me/dataTypes'
const SLEEP_URL  = `${HEALTH_BASE}/sleep/dataPoints`
const SYNC_DAYS  = 3
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// Known activity dataType strings to attempt. The Google Health Connect REST
// API v4 has minimal public docs; these are the most likely names based on
// the Android SDK reference. Failures on individual types are logged + skipped.
// Known dataType strings to attempt. Alternatives are listed for uncertain names
// (the correct one will be confirmed at first run; failures are logged + skipped).
const ACTIVITY_TYPES = [
  'steps',
  'calories',
  'calories.expended',    // alternative — API docs unclear
  'active_zone_minutes',
  'active_minutes',       // alternative name used by some Fitbit endpoints
  'distance',
  'distance.delta',       // alternative
  'resting_heart_rate',
  'heart_rate_variability_rmssd',
  'hrv_rmssd',            // alternative shorter form
  'oxygen_saturation',
  'respiratory_rate',
  'skin_temperature_deviation',
]

// Which types map to the same Firestore field (only first successful one wins)
const TYPE_ALIASES = {
  'calories.expended': 'calories',
  'active_minutes':    'active_zone_minutes',
  'distance.delta':    'distance',
  'hrv_rmssd':         'heart_rate_variability_rmssd',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function parseOffset(offsetStr) {
  if (!offsetStr) return 0
  return parseInt(offsetStr.replace('s', ''), 10)
}

function localDateKey(utcIsoString, utcOffsetSeconds) {
  const utcMs = new Date(utcIsoString).getTime()
  const localMs = utcMs + utcOffsetSeconds * 1000
  const d = new Date(localMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayLocalKey() {
  // Use Vienna time (CET/CEST). Since we run at 07:00 UTC = 08:00/09:00 Vienna,
  // "today" in Vienna is always the same as UTC date at that hour.
  return localDateKey(new Date().toISOString(), 3600) // CET=+1h; CEST=+2h covered by >07:00 UTC
}

// ── Step A: Get Access Token ─────────────────────────────────────────────────

async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()

  if (!res.ok) {
    if (data.error === 'invalid_grant') {
      console.error('❌ invalid_grant: Refresh-Token abgelaufen.')
      console.error('   → Re-Autorisierung erforderlich. Bitte OAuth-Flow erneut durchlaufen.')
      console.error('   → Details:', data.error_description || '(keine Details)')
    } else {
      console.error(`❌ Token-Fehler: ${data.error} — ${data.error_description}`)
    }
    process.exit(1)
  }

  return data.access_token
}

// ── Step B: Fetch Sleep DataPoints (paginated, with 500-retry) ───────────────

async function fetchSleepDataPoints(accessToken) {
  const since = new Date(Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const filter = `sleep.interval.end_time >= "${since}"`

  const allPoints = []
  let pageToken = null

  do {
    const url = new URL(SLEEP_URL)
    url.searchParams.set('pageSize', '25')
    url.searchParams.set('filter', filter)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    let res
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      })

      if (res.status === 500) {
        console.warn(`  ⚠ API 500 (Versuch ${attempt}/${MAX_RETRIES}) — retry in ${RETRY_DELAY_MS}ms`)
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS)
        continue
      }
      break
    }

    if (!res.ok) {
      const body = await res.text()
      console.error(`❌ Sleep API-Fehler ${res.status}: ${body}`)
      process.exit(1)
    }

    const data = await res.json()
    const points = data.dataPoints || []
    allPoints.push(...points)
    pageToken = data.nextPageToken || null

    console.log(`  Seite geladen: ${points.length} DataPoints${pageToken ? ' (weitere folgen)' : ''}`)
  } while (pageToken)

  return allPoints
}

// ── Step C: Fetch one Activity DataType (graceful — returns null on error) ───

async function fetchActivityType(accessToken, dataType) {
  // No date filter — activity endpoints use different filter syntax than sleep.
  // We fetch the latest 25 points and filter by date client-side.
  const url = new URL(`${HEALTH_BASE}/${dataType}/dataPoints`)
  url.searchParams.set('pageSize', '25')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })

    if (res.status === 404 || res.status === 403) {
      console.log(`  ℹ ${dataType}: nicht verfügbar (HTTP ${res.status})`)
      return null
    }

    if (!res.ok) {
      const body = await res.text()
      console.warn(`  ⚠ ${dataType}: Fehler ${res.status} — ${body.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const points = data.dataPoints || []
    console.log(`  ✓ ${dataType}: ${points.length} DataPoints`)
    return points
  } catch (err) {
    console.warn(`  ⚠ ${dataType}: Netzwerkfehler — ${err.message}`)
    return null
  }
}

// ── Step D: Parse a single activity dataPoint value ──────────────────────────
// Google Health dataPoints may carry values in different fields depending on type.
// We try common field names; the correct one is confirmed when live data arrives.

function extractValue(dataPoint, dataType) {
  if (!dataPoint) return null

  // Try top-level value fields (common pattern)
  const d = dataPoint[dataType] || dataPoint

  // Numeric fields to probe (covers known patterns)
  const candidates = [
    d?.count,
    d?.value,
    d?.kcal,
    d?.minutes,
    d?.meters,
    d?.bpm,
    d?.rmssd,
    d?.percentage,
    d?.breaths_per_minute,
    d?.deviation,
  ]

  for (const c of candidates) {
    if (c != null && !isNaN(Number(c))) return Number(c)
  }

  // Fallback: first numeric leaf in the object
  const vals = Object.values(d || {}).filter(v => typeof v === 'number')
  return vals.length > 0 ? vals[0] : null
}

// ── Step E: Aggregate activity dataPoints for a given date ───────────────────

function aggregateActivity(pointsByType, dateKey) {
  const result = { date: dateKey }

  for (let [dataType, points] of Object.entries(pointsByType)) {
    // Normalise alias → canonical type so field mapping is consistent
    dataType = TYPE_ALIASES[dataType] || dataType
    if (!points || points.length === 0) continue

    // Filter to target date (use endTime)
    const dayPoints = points.filter(p => {
      const et = p.interval?.endTime || p.endTime
      if (!et) return false
      return et.startsWith(dateKey) || localDateKey(et, 0) === dateKey
    })

    if (dayPoints.length === 0) continue

    const values = dayPoints.map(p => extractValue(p, dataType)).filter(v => v != null)
    if (values.length === 0) continue

    // For cumulative metrics (steps, calories, distance) → sum
    // For point metrics (HR, HRV, SpO2, etc.) → most recent value
    const cumulative = ['steps', 'calories', 'distance', 'active_zone_minutes']
    const isSum = cumulative.some(t => dataType.includes(t.split('_')[0]))
    const agg = isSum
      ? values.reduce((a, b) => a + b, 0)
      : values[values.length - 1]

    // Map API type → Firestore field name
    const fieldMap = {
      'steps':                       'steps',
      'calories':                    'calories',
      'active_zone_minutes':         'azm',
      'distance':                    'distanceM',
      'resting_heart_rate':          'restingHr',
      'heart_rate_variability_rmssd':'hrv',
      'oxygen_saturation':           'spo2',
      'respiratory_rate':            'respiratoryRate',
      'skin_temperature_deviation':  'skinTempDeviation',
    }

    const field = fieldMap[dataType] || dataType
    // Don't overwrite an already-set field (alias duplicate)
    if (result[field] != null) continue
    result[field] = Math.round(agg * 100) / 100
  }

  return result
}

// ── Step F: Build 7-day trend arrays for HR and HRV ─────────────────────────

function build7DayTrends(pointsByType) {
  const trends = {}

  const trendTypes = {
    'resting_heart_rate':           'restingHr7days',
    'heart_rate_variability_rmssd': 'hrv7days',
  }

  for (const [apiType, fieldName] of Object.entries(trendTypes)) {
    const points = pointsByType[apiType]
    if (!points || points.length === 0) continue

    // Group by date, take last value per day
    const byDate = {}
    for (const p of points) {
      const et = p.interval?.endTime || p.endTime
      if (!et) continue
      const date = et.slice(0, 10)
      const val = extractValue(p, apiType)
      if (val != null) byDate[date] = val
    }

    const sorted = Object.keys(byDate).sort()
    const last7 = sorted.slice(-7).map(d => byDate[d])
    if (last7.length > 0) trends[fieldName] = last7
  }

  return trends
}

// ── Step G: Filter FITBIT only ────────────────────────────────────────────────

function filterFitbit(dataPoints) {
  return dataPoints.filter(p => p.dataSource?.platform === 'FITBIT')
}

// ── Step H: Normalize sleep dataPoint → Firestore schema ─────────────────────

function normalizeSleep(dataPoint) {
  const s = dataPoint.sleep
  const endOffset = parseOffset(s.interval.endUtcOffset)
  const dateKey = localDateKey(s.interval.endTime, endOffset)

  return {
    date: dateKey,
    platform: dataPoint.dataSource.platform,
    type: s.type,
    interval: {
      startTime: s.interval.startTime,
      endTime:   s.interval.endTime,
      startUtcOffset: parseOffset(s.interval.startUtcOffset),
      endUtcOffset:   endOffset,
    },
    summary: {
      minutesInSleepPeriod: parseInt(s.summary.minutesInSleepPeriod, 10),
      minutesAsleep:         parseInt(s.summary.minutesAsleep, 10),
      minutesAwake:          parseInt(s.summary.minutesAwake, 10),
      minutesAfterWakeUp:    parseInt(s.summary.minutesAfterWakeUp, 10),
      minutesToFallAsleep:   parseInt(s.summary.minutesToFallAsleep, 10),
      stagesSummary: s.summary.stagesSummary.map(st => ({
        type:    st.type,
        count:   parseInt(st.count, 10),
        minutes: parseInt(st.minutes, 10),
      })),
    },
    stages: s.stages.map(st => ({
      type:           st.type,
      startTime:      st.startTime,
      endTime:        st.endTime,
      startUtcOffset: parseOffset(st.startUtcOffset),
      endUtcOffset:   parseOffset(st.endUtcOffset),
    })),
    syncedAt: new Date().toISOString(),
  }
}

// ── Firestore Upsert ──────────────────────────────────────────────────────────

async function upsertSleep(normalized) {
  const docRef = db.doc(`health/main/sleep/${normalized.date}`)
  await docRef.set(normalized, { merge: true })
}

async function upsertDaily(daily) {
  const docRef = db.doc(`health/main/daily/${daily.date}`)
  await docRef.set({ ...daily, syncedAt: new Date().toISOString() }, { merge: true })
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌙 Health Sync gestartet')

  const required = [
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
  ]
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Fehlende Umgebungsvariable: ${key}`)
      process.exit(1)
    }
  }

  console.log('→ Access-Token holen...')
  const accessToken = await getAccessToken()
  console.log('✓ Access-Token erhalten')

  // ── Sleep Sync ──────────────────────────────────────────────────────────────
  console.log(`\n→ Sleep-Daten abrufen (letzte ${SYNC_DAYS} Tage)...`)
  const allPoints = await fetchSleepDataPoints(accessToken)
  console.log(`✓ ${allPoints.length} DataPoints total`)

  const fitbitPoints = filterFitbit(allPoints)
  console.log(`✓ ${fitbitPoints.length} FITBIT DataPoints (${allPoints.length - fitbitPoints.length} andere gefiltert)`)

  if (fitbitPoints.length > 0) {
    console.log('→ Sleep Firestore upsert...')
    for (const point of fitbitPoints) {
      const norm = normalizeSleep(point)
      await upsertSleep(norm)
      console.log(`  ✓ Sleep ${norm.date}: ${norm.summary.minutesAsleep} min, ${norm.stages.length} Phasen`)
    }
  } else {
    console.log('ℹ Keine FITBIT Sleep-Daten — nichts zu schreiben.')
  }

  // ── Activity Sync ───────────────────────────────────────────────────────────
  console.log('\n→ Activity-Daten abrufen...')

  const pointsByType = {}
  for (const dataType of ACTIVITY_TYPES) {
    const points = await fetchActivityType(accessToken, dataType)
    if (points !== null) pointsByType[dataType] = points
  }

  const availableTypes = Object.keys(pointsByType)
  console.log(`✓ ${availableTypes.length} von ${ACTIVITY_TYPES.length} Typen erfolgreich abgerufen`)

  if (availableTypes.length > 0) {
    // Aggregate for the last SYNC_DAYS days
    const trends = build7DayTrends(pointsByType)
    const processedDates = new Set()

    for (let d = 0; d < SYNC_DAYS; d++) {
      const dateKey = localDateKey(
        new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString(), 3600
      )
      if (processedDates.has(dateKey)) continue
      processedDates.add(dateKey)

      const daily = aggregateActivity(pointsByType, dateKey)
      const hasData = Object.keys(daily).filter(k => k !== 'date').length > 0

      if (hasData) {
        // Attach 7-day trends to today's record
        if (d === 0) Object.assign(daily, trends)
        await upsertDaily(daily)
        const fields = Object.keys(daily).filter(k => !['date', 'syncedAt'].includes(k) && !k.includes('7days'))
        console.log(`  ✓ Daily ${dateKey}: ${fields.join(', ')}`)
      }
    }
  } else {
    console.log('ℹ Keine Activity-Daten gefunden — prüfe ob Scopes korrekt sind.')
    console.log('  Benötigt: googlehealth.activity_and_fitness.readonly,')
    console.log('            googlehealth.health_metrics_and_measurements.readonly')
  }

  console.log('\n✅ Sync abgeschlossen')
}

main().catch(err => {
  console.error('❌ Unerwarteter Fehler:', err)
  process.exit(1)
})
