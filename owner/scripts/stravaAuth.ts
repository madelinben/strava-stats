/**
 * Shared Strava OAuth helpers — used by the `npm run auth` CLI script and by
 * the local-dev in-app connect wizard (vite.config.ts). Never imported by
 * anything that ships in the browser bundle.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ENV_PATH = join(process.cwd(), '.env');
export const ENV_EXAMPLE_PATH = join(process.cwd(), '.env.example');

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname: string; lastname: string };
}

export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<TokenResponse>;
}

/** Create .env from .env.example if missing, then set/update one key. */
export function writeEnvVar(key: string, value: string): void {
  let text = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8')
    : existsSync(ENV_EXAMPLE_PATH)
      ? readFileSync(ENV_EXAMPLE_PATH, 'utf8')
      : '';
  const line = new RegExp(`^${key}=.*$`, 'm');
  if (line.test(text)) {
    text = text.replace(line, `${key}=${value}`);
  } else {
    text += `${text.endsWith('\n') || text === '' ? '' : '\n'}${key}=${value}\n`;
  }
  writeFileSync(ENV_PATH, text, 'utf8');
}

/** Escape untrusted text (query params, error messages) before interpolating
 * into htmlPage's body — this only ever serves the local OAuth callback, but
 * cheap to not reflect unescaped input into HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function htmlPage(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px;line-height:1.5}
  code{background:#f3f3f3;padding:2px 6px;border-radius:4px;word-break:break-all}</style></head>
  <body>${body}</body></html>`;
}
