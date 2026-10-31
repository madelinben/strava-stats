import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ConnectPanel } from "./components/ConnectPanel";
import { Dashboard } from "./components/Dashboard";
import { clearSession, loadSession, saveSession, takePending } from "./lib/session";
import { exchangeCode, type Session } from "./lib/strava";

const queryClient = new QueryClient();

interface StravaAppProps {
  /** Must match the Authorization Callback Domain of the user's Strava API app. Defaults to the current page. */
  redirectUri?: string;
  /** Called after a sticker handoff is stored; the host navigates to the sticker maker. */
  onMakeSticker?: () => void;
}

export function StravaApp({ redirectUri, onMakeSticker }: StravaAppProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [redirect, setRedirect] = useState(redirectUri ?? "");

  // Runs once on the client: finish an OAuth round trip (?code&state) or restore the stored session.
  useEffect(() => {
    setRedirect((r) => r || `${location.origin}${location.pathname}`);
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setSession(loadSession());
      setReady(true);
      return;
    }
    history.replaceState(null, "", location.pathname + location.hash);
    const pending = takePending();
    if (!pending || pending.state !== state) {
      setError("Couldn't verify the Strava connection. Please try again.");
      setReady(true);
      return;
    }
    exchangeCode(pending, code)
      .then((s) => {
        saveSession(s);
        setSession(s);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="h-64 animate-pulse bg-slate-100" />;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="bg-slate-50 text-slate-900">
        {session ? (
          <Dashboard
            session={session}
            onSession={(s) => {
              saveSession(s);
              setSession(s);
            }}
            onDisconnect={() => {
              clearSession();
              queryClient.clear();
              setSession(null);
            }}
            onSticker={onMakeSticker ?? (() => {})}
          />
        ) : (
          <ConnectPanel redirectUri={redirect} error={error} />
        )}
      </div>
    </QueryClientProvider>
  );
}
