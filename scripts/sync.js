/**
 * Sleep Sync Script
 * Fetches sleep data from Google Health API → filters FITBIT → upserts to Firestore
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

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SLEEP_URL = 'https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints'
const SYNC_DAYS = 3       // how many days back to fetch
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Parse "7200s" → 7200 (number of seconds)
 */
function parseOffset(offsetStr) {
  if (!offsetStr) return 0
  return parseInt(offsetStr.replace('s', ''), 10)
}

/**
 * Compute local date string (YYYY-MM-DD) from a UTC ISO string + utcOffset in seconds.
 * Used to determine the "wake-up day" as the Firestore key.
 */
function localDateKey(utcIsoString, utcOffsetSeconds) {
  const utcMs = new Date(utcIsoString).getTime()
  const localMs = utcMs + utcOffsetSeconds * 1000
  const localDate = new Date(localMs)
  const y = localDate.getUTCFullYear()
  const m = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(localDate.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Normalize a raw API dataPoint into the Firestore schema.
 * All string numbers are parsed; offsets converted to Number.
 */
function normalize(dataPoint) {
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })

      if (res.status === 500) {
        console.warn(`  ⚠ API 500 (Versuch ${attempt}/${MAX_RETRIES}) — retry in ${RETRY_DELAY_MS}ms`)
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
        continue
      }
      break
    }

    if (!res.ok) {
      const body = await res.text()
      console.error(`❌ API-Fehler ${res.status}: ${body}`)
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

// ── Step C: Filter FITBIT only ───────────────────────────────────────────────

function filterFitbit(dataPoints) {
  return dataPoints.filter(p => p.dataSource?.platform === 'FITBIT')
}

// ── Step D: Upsert to Firestore ──────────────────────────────────────────────

async function upsertToFirestore(normalized) {
  const docRef = db.doc(`health/main/sleep/${normalized.date}`)
  // merge: true → wakeNotes subcollection + nightNote field never overwritten
  await docRef.set(normalized, { merge: true })
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌙 Sleep Sync gestartet')

  // Validate env
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

  console.log(`→ Sleep-Daten abrufen (letzte ${SYNC_DAYS} Tage)...`)
  const allPoints = await fetchSleepDataPoints(accessToken)
  console.log(`✓ ${allPoints.length} DataPoints total`)

  const fitbitPoints = filterFitbit(allPoints)
  console.log(`✓ ${fitbitPoints.length} FITBIT-DataPoints (${allPoints.length - fitbitPoints.length} andere gefiltert)`)

  if (fitbitPoints.length === 0) {
    console.log('ℹ Keine neuen FITBIT-Daten — nichts zu schreiben.')
    return
  }

  console.log('→ Firestore upsert...')
  let count = 0
  for (const point of fitbitPoints) {
    const norm = normalize(point)
    await upsertToFirestore(norm)
    console.log(`  ✓ ${norm.date}: ${norm.summary.minutesAsleep} min Schlaf, ${norm.stages.length} Phasen`)
    count++
  }

  console.log(`\n✅ Sync abgeschlossen: ${count} Nacht/Nächte verarbeitet`)
}

main().catch(err => {
  console.error('❌ Unerwarteter Fehler:', err)
  process.exit(1)
})
