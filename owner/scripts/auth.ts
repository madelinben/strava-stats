/**
 * One-time Strava OAuth helper.
 * Opens a local callback server, prints tokens to paste into .env / GitHub Secrets.
 * Never commits tokens — write them only to a gitignored .env yourself.
 *
 * Usage: npm run auth
 */
import http from 'node:http';
import { URL } from 'node:url';
import { config } from 'dotenv';
import { exchangeCode as exchangeCodeShared, escapeHtml, htmlPage } from './stravaAuth';

config();

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.STRAVA_REDIRECT_URI ?? 'http://localhost:8787/callback';
const PORT = Number(new URL(REDIRECT_URI).port || 8787);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET.\n' +
      'Copy .env.example → .env and fill client id/secret from https://www.strava.com/settings/api\n' +
      `Also add Authorization Callback Domain / redirect: ${REDIRECT_URI}`,
  );
  process.exit(1);
}

const authUrl = new URL('https://www.strava.com/oauth/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('approval_prompt', 'force');
authUrl.searchParams.set('scope', 'read,activity:read_all');

function exchangeCode(code: string) {
  return exchangeCodeShared(CLIENT_ID!, CLIENT_SECRET!, code);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    if (url.pathname !== new URL(REDIRECT_URI).pathname) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const err = url.searchParams.get('error');
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(htmlPage('Denied', `<h1>Authorization denied</h1><p>${escapeHtml(err)}</p>`));
      server.close();
      process.exit(1);
    }
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(htmlPage('Missing code', '<h1>No code in callback</h1>'));
      return;
    }
    const tokens = await exchangeCode(code);
    console.log('\n=== Paste into .env (gitignored) and GitHub Actions Secrets ===\n');
    console.log(`STRAVA_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nAthlete:', tokens.athlete?.firstname, tokens.athlete?.lastname);
    console.log('Access token expires at:', new Date(tokens.expires_at * 1000).toISOString());
    console.log('\nDo NOT commit these values. Close this tab when done.\n');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      htmlPage(
        'Success',
        `<h1>Strava auth OK</h1>
         <p>Refresh token printed in the terminal. Add it to <code>.env</code> and GitHub Secrets as <code>STRAVA_REFRESH_TOKEN</code>.</p>
         <p>You can close this window.</p>`,
      ),
    );
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(htmlPage('Error', `<h1>Auth failed</h1><pre>${escapeHtml(String(e))}</pre>`));
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Listening for OAuth callback on ${REDIRECT_URI}`);
  console.log('\nOpen this URL in your browser to authorize:\n');
  console.log(authUrl.toString());
  console.log('');
});
