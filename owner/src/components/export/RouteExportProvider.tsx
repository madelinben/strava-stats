import { createContext, lazy, Suspense, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ActivityLite, SportRoute } from '../../types';
import type { StatItem } from '../../lib/export/statsOverlay';

const SingleRouteExport = lazy(() =>
  import('./SingleRouteExport').then((m) => ({ default: m.SingleRouteExport })),
);

interface Ctx {
  canExport: (activityId: number) => boolean;
  open: (activity: ActivityLite, extraStats?: StatItem[]) => void;
}

const RouteExportContext = createContext<Ctx>({ canExport: () => false, open: () => {} });

export const useRouteExport = () => useContext(RouteExportContext);

/** One shared single-route export dialog for every "Image" button on the page. */
export function RouteExportProvider({
  routes,
  children,
}: {
  routes: SportRoute[];
  children: ReactNode;
}) {
  const byId = useMemo(() => new Map(routes.map((r) => [r.id, r.polyline])), [routes]);
  const [active, setActive] = useState<{ activity: ActivityLite; extra: StatItem[] } | null>(null);

  const ctx = useMemo<Ctx>(
    () => ({
      canExport: (id) => byId.has(id),
      open: (activity, extra = []) => setActive({ activity, extra }),
    }),
    [byId],
  );

  return (
    <RouteExportContext.Provider value={ctx}>
      {children}
      {active ? (
        <Suspense fallback={null}>
          <SingleRouteExport
            activity={active.activity}
            polyline={byId.get(active.activity.id) ?? ''}
            extraStats={active.extra}
            onClose={() => setActive(null)}
          />
        </Suspense>
      ) : null}
    </RouteExportContext.Provider>
  );
}

/** Small "Image" button — renders nothing when the activity has no GPS route. */
export function ExportRouteButton({
  activity,
  extraStats,
}: {
  activity: ActivityLite;
  extraStats?: StatItem[];
}) {
  const { canExport, open } = useRouteExport();
  if (!canExport(activity.id)) return null;
  return (
    <button
      type="button"
      className="export-trigger export-trigger-sm"
      onClick={(e) => {
        e.stopPropagation();
        open(activity, extraStats);
      }}
      aria-label={`Download route image for ${activity.name}`}
    >
      Image
    </button>
  );
}
