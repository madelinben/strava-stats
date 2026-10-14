import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { MapPoint } from '../types';

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

export function ActivityMap({
  points,
  color,
}: {
  points: MapPoint[];
  color: string;
}) {
  if (!points.length) {
    return (
      <div className="map-box" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="muted">No locations to plot</span>
      </div>
    );
  }

  const center: [number, number] = [points[0].lat, points[0].lng];

  return (
    <MapContainer
      className="map-box"
      center={center}
      zoom={10}
      scrollWheelZoom={false}
      style={{ height: 420, width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {points.map((p) => (
        <CircleMarker
          key={`${p.name}-${p.date}-${p.lat}-${p.lng}`}
          center={[p.lat, p.lng]}
          radius={7}
          pathOptions={{
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.date}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
