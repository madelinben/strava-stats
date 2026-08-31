export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_KM = 6371;

/** Haversine distance in km (pure math — no paid geocoding). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface GeoCluster<T extends LatLng> {
  center: LatLng;
  bounds: { south: number; west: number; north: number; east: number };
  items: T[];
}

/**
 * Single-linkage distance clustering (DBSCAN with minPts=1): any two items
 * within `thresholdKm` end up in the same cluster, transitively. O(n²) —
 * fine at the scale this runs on (activities per sport per year).
 */
export function clusterByDistance<T extends LatLng>(
  items: T[],
  thresholdKm: number,
): GeoCluster<T>[] {
  const n = items.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (distanceKm(items[i], items[j]) <= thresholdKm) union(i, j);
    }
  }

  const groups = new Map<number, T[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(items[i]);
  }

  return [...groups.values()].map((group) => {
    const lats = group.map((g) => g.lat);
    const lngs = group.map((g) => g.lng);
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);
    return {
      center: { lat: (south + north) / 2, lng: (west + east) / 2 },
      bounds: { south, west, north, east },
      items: group,
    };
  });
}
