import type { MapRegion } from '../types';

/** Square cards under a map/heatmap — pick one to filter the map down to just
 * that geographic cluster of activities; nothing to browse with 0 or 1
 * region, so the whole carousel disappears. */
export function RegionCarousel({
  regions,
  selectedId,
  onSelect,
}: {
  regions: MapRegion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (regions.length < 2) return null;

  const totalCount = regions.reduce((s, r) => s + r.count, 0);

  return (
    <div className="region-carousel">
      <button
        type="button"
        className={`region-card${selectedId === null ? ' is-active' : ''}`}
        onClick={() => onSelect(null)}
      >
        <div className="region-card-label">All areas</div>
        <div className="region-card-count">{totalCount} logged</div>
      </button>
      {regions.map((region) => (
        <button
          key={region.id}
          type="button"
          className={`region-card${selectedId === region.id ? ' is-active' : ''}`}
          onClick={() => onSelect(selectedId === region.id ? null : region.id)}
        >
          <div className="region-card-label">{region.label || 'Unknown area'}</div>
          <div className="region-card-count">{region.count} logged</div>
        </button>
      ))}
    </div>
  );
}
