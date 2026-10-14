import { ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { savePending } from "../lib/session";
import { authorizeUrl } from "../lib/strava";

const inputCls = "min-h-11 rounded-xl border-2 border-slate-200 px-3 text-base outline-none focus:border-orange-500";

export function ConnectPanel({ redirectUri, error }: { redirectUri: string; error: string }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const domain = new URL(redirectUri).hostname;

  function connect(e: React.FormEvent) {
    e.preventDefault();
    const state = crypto.randomUUID();
    savePending({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), state });
    window.location.assign(authorizeUrl(clientId.trim(), redirectUri, state));
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 p-4">
      <p className="text-slate-700">
        See your Strava stats your way. This tool talks to Strava <strong>directly from your browser</strong> using your own free Strava API app, so your
        activities and keys never touch our servers.
      </p>

      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-slate-700">
        <li>
          Create an API app at{" "}
          <a className="inline-flex items-center gap-1 font-semibold text-orange-600 underline" href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">
            strava.com/settings/api <ExternalLink size={12} />
          </a>
        </li>
        <li>
          Set <strong>Authorization Callback Domain</strong> to <code className="rounded bg-slate-100 px-1">{domain}</code>
        </li>
        <li>Paste the Client ID and Client Secret below, then connect.</li>
      </ol>

      <form onSubmit={connect} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Client ID
          <input className={inputCls} inputMode="numeric" value={clientId} onChange={(e) => setClientId(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Client Secret
          <input className={inputCls} type="password" autoComplete="off" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" className="min-h-12 rounded-xl bg-orange-600 text-base font-extrabold text-white transition active:scale-[0.98]">
          Connect with Strava
        </button>
      </form>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        Your keys and activity data are stored only in this browser (local storage) and sent only to Strava. Use &ldquo;Disconnect&rdquo; to erase them.
      </p>
    </div>
  );
}
