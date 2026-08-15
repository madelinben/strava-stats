import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const DAY_MS = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DAY_MS,
      gcTime: DAY_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.sessionStorage,
  key: 'strava-stats-query',
});

/**
 * Read the deploy stamp written by `pnpm run sync` / GitHub Actions.
 * GitHub Pages has no revalidate API — changing this buster drops persisted RQ cache.
 */
async function readCacheBuster(): Promise<string> {
  try {
    const url = `${import.meta.env.BASE_URL}data/version.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return 'no-version';
    const body = (await res.json()) as { generatedAt?: string };
    return body.generatedAt || 'no-version';
  } catch {
    return 'no-version';
  }
}

async function boot(): Promise<void> {
  const buster = await readCacheBuster();
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root');

  createRoot(root).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: DAY_MS,
          buster,
        }}
      >
        <App />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

void boot();
