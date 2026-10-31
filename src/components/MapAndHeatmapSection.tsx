import { lazy, Suspense, useState } from 'react';
import type { MapPoint, MapRegion, SportRoute } from '../types';
import { filterByRegion } from '../lib/sports';
import { ActivityMap } from './ActivityMap';
import { RouteHeatmap } from './RouteHeatmap';
import { RegionCarousel } from './RegionCarousel';

const RouteExport = lazy(() =>
  import('./export/RouteExport').then((m) => ({ default: m.RouteExport })),
);

/** A location-pin map + a Route Heatmap for one sport, each with a region
 * carousel underneath — picking a region filters both down to just that
 * geographic cluster of activities and re-fits the map to it. */
export function MapAndHeatmapSection({
  idPrefix,
  label,
  points,
  routes,
  regions,
  markerColor,
}: {
  idPrefix: string;
  label: string;
  points: MapPoint[];
  routes: SportRoute[];
  regions: MapRegion[];
  markerColor: string;
}) {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const selectedRegion = regions.find((r) => r.id === selectedRegionId) ?? null;
  const filteredPoints = filterByRegion(points, selectedRegion);
  const filteredRoutes = filterByRegion(routes, selectedRegion);
  const [exportOpen, setExportOpen] = useState(false);

  const regionSlug = selectedRegion
    ? `-${selectedRegion.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : '';

  return (
    <>
      {points.length > 0 ? (
        <section id={`${idPrefix}-map`}>
          <h2>{label} location map</h2>
          <div className="card map-card" style={{ padding: 0, overflow: 'hidden' }}>
            <ActivityMap points={filteredPoints} color={markerColor} />
          </div>
          <p className="muted">
            {filteredPoints.length} starting locations pinned · map tiles © OpenStreetMap contributors
          </p>
          <RegionCarousel regions={regions} selectedId={selectedRegionId} onSelect={setSelectedRegionId} />
        </section>
      ) : null}

      {routes.length > 0 ? (
        <section id={`${idPrefix}-route-heatmap`}>
          <h2>Route Heatmap</h2>
          <div className="map-card-wrap">
            <div className="card map-card" style={{ padding: 0, overflow: 'hidden' }}>
              <RouteHeatmap routes={filteredRoutes} />
            </div>
            <button
              type="button"
              className="map-download-btn"
              onClick={() => setExportOpen(true)}
              aria-label="Download heatmap image"
              title="Download heatmap image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </button>
          </div>
          <p className="muted">{filteredRoutes.length} routes overlaid · brighter = more often covered</p>
          <RegionCarousel regions={regions} selectedId={selectedRegionId} onSelect={setSelectedRegionId} />
        </section>
      ) : null}

      {exportOpen ? (
        <Suspense fallback={null}>
          <RouteExport
            routes={filteredRoutes}
            filename={`${idPrefix}-route-heatmap${regionSlug}.png`}
            onClose={() => setExportOpen(false)}
          />
        </Suspense>
      ) : null}
    </>
  );
}
