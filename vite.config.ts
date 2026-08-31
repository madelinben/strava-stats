import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseEnv } from 'dotenv';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ENV_PATH, escapeHtml, exchangeCode, htmlPage, writeEnvVar } from './scripts/stravaAuth';

/** Re-run the sync script — shared by the manual re-sync button and the
 * connect wizard's "run first sync" step. */
function runSync(cb: (err: Error | null, stdout: string, stderr: string) => void): void {
  execFile('pnpm', ['run', 'sync'], { cwd: process.cwd(), timeout: 120_000 }, cb);
}

/** Dev-only: POST /api/dev/sync re-runs the same sync script the daily cron runs. */
function devSyncEndpoint(): Plugin {
  return {
    name: 'dev-sync-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/dev/sync', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        runSync((err, stdout, stderr) => {
          res.setHeader('Content-Type', 'application/json');
          if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: stderr || err.message }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, output: stdout }));
        });
      });
    },
  };
}

/** Dev-only: POST /api/dev/events writes the tracked-events list to
 * public/data/events.json, so it's hardcoded (git-tracked) rather than living
 * only in browser storage. Schema has no secrets — title/date/distance/type/link. */
function devEventsEndpoint(): Plugin {
  const eventsPath = join(process.cwd(), 'public', 'data', 'events.json');
  return {
    name: 'dev-events-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/dev/events', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const events = JSON.parse(body);
            writeFileSync(eventsPath, `${JSON.stringify(events, null, 2)}\n`);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

/**
 * Dev-only Strava connect wizard, driven from the browser instead of the
 * `npm run auth` CLI. Two steps:
 *  1. POST credentials — saves client id/secret to .env, hands back the
 *     callback redirect URI to authorize against.
 *  2. GET callback — Strava redirects here with a `code`; exchange it,
 *     save the refresh token, run a first sync, bounce back to `/`.
 * Client secret only ever travels browser → this endpoint → .env — it's
 * never included in the Strava authorize redirect URL.
 */
function devStravaAuthEndpoint(): Plugin {
  return {
    name: 'dev-strava-auth-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/dev/strava-auth/credentials', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const { clientId, clientSecret } = JSON.parse(body) as {
              clientId?: string;
              clientSecret?: string;
            };
            if (!clientId || !clientSecret) {
              throw new Error('clientId and clientSecret are required');
            }
            writeEnvVar('STRAVA_CLIENT_ID', clientId);
            writeEnvVar('STRAVA_CLIENT_SECRET', clientSecret);
            const host = req.headers.host ?? 'localhost:5173';
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                redirectUri: `http://${host}/api/dev/strava-auth/callback`,
              }),
            );
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
          }
        });
      });

      server.middlewares.use('/api/dev/strava-auth/callback', (req, res) => {
        void (async () => {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const error = url.searchParams.get('error');
          const code = url.searchParams.get('code');
          res.setHeader('Content-Type', 'text/html');

          if (error) {
            res.statusCode = 400;
            res.end(htmlPage('Denied', `<h1>Authorization denied</h1><p>${escapeHtml(error)}</p>`));
            return;
          }
          if (!code) {
            res.statusCode = 400;
            res.end(htmlPage('Missing code', '<h1>No code in callback</h1>'));
            return;
          }

          try {
            const env = parseEnv(readFileSync(ENV_PATH, 'utf8'));
            const clientId = env.STRAVA_CLIENT_ID;
            const clientSecret = env.STRAVA_CLIENT_SECRET;
            if (!clientId || !clientSecret) throw new Error('Client id/secret missing from .env');

            const tokens = await exchangeCode(clientId, clientSecret, code);
            writeEnvVar('STRAVA_REFRESH_TOKEN', tokens.refresh_token);

            runSync(() => {
              res.statusCode = 200;
              res.end(
                htmlPage(
                  'Connected',
                  `<h1>Strava connected</h1><p>Redirecting back to the dashboard…</p>
                   <script>setTimeout(() => { window.location.href = '/strava-stats/'; }, 900);</script>`,
                ),
              );
            });
          } catch (e) {
            res.statusCode = 500;
            res.end(htmlPage('Error', `<h1>Connection failed</h1><pre>${escapeHtml(String(e))}</pre>`));
          }
        })();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devSyncEndpoint(), devEventsEndpoint(), devStravaAuthEndpoint()],
  base: '/strava-stats/',
});
