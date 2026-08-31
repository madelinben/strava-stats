export function YearNav({
  year,
  availableYears,
  onChange,
  allTime,
  onToggleAllTime,
}: {
  year: number;
  availableYears: number[];
  onChange: (year: number) => void;
  allTime: boolean;
  onToggleAllTime: (allTime: boolean) => void;
}) {
  const index = availableYears.indexOf(year);
  const canPrev = index > 0;
  const canNext = index >= 0 && index < availableYears.length - 1;

  return (
    <span className="year-nav" role="group" aria-label="Select year">
      <button
        type="button"
        className="year-nav-btn"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(availableYears[index - 1])}
        aria-label="Previous year"
      >
        ‹
      </button>
      <span className="year-nav-label">{year}</span>
      <button
        type="button"
        className="year-nav-btn"
        disabled={!canNext}
        onClick={() => canNext && onChange(availableYears[index + 1])}
        aria-label="Next year"
      >
        ›
      </button>
      <button
        type="button"
        className={`year-nav-alltime${allTime ? ' is-active' : ''}`}
        onClick={() => onToggleAllTime(!allTime)}
        aria-pressed={allTime}
        title="Show all-time stats for the rest of the page (heatmap above stays year-by-year)"
      >
        All time
      </button>
    </span>
  );
}
