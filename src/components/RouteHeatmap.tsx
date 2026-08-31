import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import type { SportRoute } from '../types';
import { decodePolyline } from '../lib/polyline';

function FitRoutes({ routes }: { routes: [number, number][][] }) {
  const map = useMap();
  useEffect(() => {
    const all = routes.flat();
    if (!all.length) return;
    map.fitBounds(all, { padding: [30, 30] });
  }, [map, routes]);
  return null;
}

/** Every logged route for a sport, overlaid as translucent orange lines —
 * paths run more often naturally look brighter as the overlapping opacity
 * stacks, giving a rough coverage heatmap without any grid/binning code. */
export function RouteHeatmap({ routes }: { routes: SportRoute[] }) {
  const decoded = useMemo(
    () => routes.map((r) => decodePolyline(r.polyline)).filter((pts) => pts.length > 1),
    [routes],
  );

  if (!decoded.length) return null;

  return (
    <MapContainer
      className="map-box route-heatmap-map"
      center={decoded[0][0]}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: 420, width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        crossOrigin="anonymous"
      />
      <FitRoutes routes={decoded} />
      {decoded.map((pts, i) => (
        <Polyline
          key={i}
          positions={pts}
          pathOptions={{ color: '#f97316', weight: 4, opacity: 0.15, lineCap: 'round' }}
        />
      ))}
    </MapContainer>
  );
}
