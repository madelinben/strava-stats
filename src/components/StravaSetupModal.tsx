import { useState } from 'react';

const REPO_URL = 'https://github.com/madelinben/strava-stats';

async function startConnect(clientId: string, clientSecret: string): Promise<void> {
  const res = await fetch('/api/dev/strava-auth/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const body = (await res.json()) as { ok: boolean; redirectUri?: string; error?: string };
  if (!body.ok || !body.redirectUri) throw new Error(body.error || 'Could not save credentials');

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', body.redirectUri);
  authUrl.searchParams.set('approval_prompt', 'force');
  authUrl.searchParams.set('scope', 'read,activity:read_all');
  window.location.href = authUrl.toString();
}

function DevConnectForm() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await startConnect(clientId, clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="modal-form">
      <p className="muted" style={{ marginTop: 0 }}>
        Create an API app at{' '}
        <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">
          strava.com/settings/api
        </a>{' '}
        (Authorization Callback Domain: <code>localhost</code>), then paste its Client ID and
        Secret below.
      </p>
      <label>
        Client ID
        <input value={clientId} onChange={(e) => setClientId(e.target.value)} required />
      </label>
      <label>
        Client Secret
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          required
        />
      </label>
      {error ? <p style={{ color: 'var(--missed)', fontSize: 13 }}>{error}</p> : null}
      <div className="modal-actions">
        <button type="submit" className="btn-location" disabled={busy}>
          {busy ? 'Connecting…' : 'Authorize with Strava'}
        </button>
      </div>
    </form>
  );
}

function ProdInstructions() {
  return (
    <div className="modal-form">
      <p className="muted" style={{ marginTop: 0 }}>
        This is a static site — it has no server to hold your Strava credentials, so connecting
        has to happen on your own machine:
      </p>
      <ol style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
        <li>
          Fork/clone the repo and run <code>pnpm dev</code> locally — the same connect wizard
          works there with input fields.
        </li>
        <li>
          Or run <code>pnpm run auth</code> from a checkout to get a refresh token via the CLI.
        </li>
        <li>Add the resulting values as GitHub Actions secrets on your fork.</li>
        <li>The scheduled sync workflow takes it from there.</li>
      </ol>
      <div className="modal-actions">
        <a
          href={`${REPO_URL}#setup`}
          target="_blank"
          rel="noreferrer"
          className="btn-location"
          style={{ textDecoration: 'none', textAlign: 'center' }}
        >
          Full setup instructions
        </a>
      </div>
    </div>
  );
}

export function StravaSetupModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Connect Strava</h3>
        {import.meta.env.DEV ? <DevConnectForm /> : <ProdInstructions />}
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 12, width: '100%' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
