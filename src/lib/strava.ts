// Strava API calls made straight from the browser with the user's OWN Strava API app credentials.
// Strava's token and API endpoints send CORS headers (access-control-allow-origin: *), so no server is involved.
const OAUTH = "https://www.strava.com/oauth";
const API = "https://www.strava.com/api/v3";

export type Credentials = { clientId: string; clientSecret: string };
export type Tokens = { accessToken: string; refreshToken: string; /** epoch seconds */ expiresAt: number };
export type Session = Credentials & Tokens & { athleteName: string };

export type Activity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  average_speed: number;
  map?: { summary_polyline?: string | null };
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { firstname?: string; lastname?: string };
};

const MAX_PAGES = 10; // 2000 activities
const PER_PAGE = 200;

export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const u = new URL(`${OAUTH}/authorize`);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", "read,activity:read_all");
  u.searchParams.set("state", state);
  return u.toString();
}

async function token(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Strava rejected the Client ID / Secret" : `Strava token error (${res.status})`);
  return (await res.json()) as TokenResponse;
}

const toTokens = (t: TokenResponse): Tokens => ({ accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at });

export async function exchangeCode(creds: Credentials, code: string): Promise<Session> {
  const t = await token({ client_id: creds.clientId, client_secret: creds.clientSecret, code, grant_type: "authorization_code" });
  const name = [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ");
  return { ...creds, ...toTokens(t), athleteName: name || "Athlete" };
}

/** Returns the session unchanged while the access token is valid, otherwise a refreshed one. */
export async function ensureFresh(s: Session, nowSec = Date.now() / 1000): Promise<Session> {
  if (s.expiresAt - 60 > nowSec) return s;
  const t = await token({ client_id: s.clientId, client_secret: s.clientSecret, refresh_token: s.refreshToken, grant_type: "refresh_token" });
  return { ...s, ...toTokens(t) };
}

async function api<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 429) throw new Error("Strava rate limit reached. Try again in 15 minutes.");
  if (!res.ok) throw new Error(`Strava API error (${res.status})`);
  return (await res.json()) as T;
}

export async function fetchAllActivities(accessToken: string): Promise<Activity[]> {
  const all: Activity[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await api<Activity[]>(`/athlete/activities?per_page=${PER_PAGE}&page=${page}`, accessToken);
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return all;
}
