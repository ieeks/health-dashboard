/**
 * Einmaliger OAuth-Flow um einen neuen Refresh-Token zu generieren.
 * Startet einen lokalen Server auf Port 8080, öffnet den Browser,
 * fängt den Code ab und tauscht ihn gegen Tokens.
 *
 * Verwendung:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-refresh-token.js
 */

import http from 'http'
import { exec } from 'child_process'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:8080/callback'
const PORT          = 8080

const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
].join(' ')

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Fehlend: GOOGLE_CLIENT_ID und/oder GOOGLE_CLIENT_SECRET')
  console.error('   Aufruf: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-refresh-token.js')
  process.exit(1)
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&access_type=offline` +
  `&prompt=consent` +
  `&scope=${encodeURIComponent(SCOPES)}`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname !== '/callback') {
    res.end('Warte auf OAuth-Callback...')
    return
  }

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    res.end(`<h2>❌ Fehler: ${error}</h2>`)
    console.error('❌ OAuth-Fehler:', error)
    server.close()
    process.exit(1)
  }

  if (!code) {
    res.end('<h2>❌ Kein Code erhalten</h2>')
    server.close()
    process.exit(1)
  }

  // Code gegen Token tauschen
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
    }).toString(),
  })

  const tokens = await tokenRes.json()

  if (!tokenRes.ok || !tokens.refresh_token) {
    res.end(`<h2>❌ Token-Fehler</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`)
    console.error('❌ Token-Antwort:', tokens)
    server.close()
    process.exit(1)
  }

  res.end(`
    <h2>✅ Refresh-Token erhalten!</h2>
    <p>Das Terminal zeigt den nächsten Schritt.</p>
    <p>Dieses Fenster kann geschlossen werden.</p>
  `)

  console.log('\n✅ Refresh-Token erhalten!')
  console.log('→ Wird als GitHub Secret gesetzt...\n')

  // GitHub Secret setzen
  const { execSync } = await import('child_process')
  try {
    execSync(
      `gh secret set GOOGLE_REFRESH_TOKEN --body "${tokens.refresh_token}" --repo ieeks/health-dashboard`,
      { stdio: 'inherit' }
    )
    console.log('✅ GOOGLE_REFRESH_TOKEN Secret aktualisiert.')
    console.log('\nDu kannst jetzt den Sync testen:')
    console.log('  gh workflow run sync.yml --repo ieeks/health-dashboard')
  } catch (e) {
    console.log('⚠ Secret konnte nicht automatisch gesetzt werden.')
    console.log('  Trag diesen Refresh-Token manuell als GOOGLE_REFRESH_TOKEN Secret ein:')
    console.log('\n  ' + tokens.refresh_token + '\n')
  }

  server.close()
})

// Wichtig: redirect_uri muss im OAuth-Client registriert sein
// Falls nicht, jetzt in der Google Cloud Console hinzufügen:
// APIs & Services → Credentials → OAuth Client → Authorized redirect URIs → http://localhost:8080/callback

server.listen(PORT, () => {
  console.log('🔐 OAuth-Flow gestartet')
  console.log(`\n⚠  Stelle sicher dass diese redirect_uri im OAuth-Client registriert ist:`)
  console.log(`   http://localhost:8080/callback`)
  console.log(`\n→ Öffne den Browser...\n`)

  // Browser öffnen (macOS)
  exec(`open "${authUrl}"`)
})
