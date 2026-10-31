const SHADES = ["bg-slate-100", "bg-orange-200", "bg-orange-300", "bg-orange-500", "bg-orange-700"];

const level = (km: number) => (km <= 0 ? 0 : km < 5 ? 1 : km < 10 ? 2 : km < 20 ? 3 : 4);

/** Calendar grid for one year: columns are weeks (Mon first), rows are weekdays. `scope` "all" shows the latest year. */
export function Heatmap({ heat, year }: { heat: Record<string, number>; year: number }) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const offset = (jan1.getUTCDay() + 6) % 7; // Monday = 0
  const days = Array.from({ length: 366 }, (_, i) => new Date(Date.UTC(year, 0, 1 + i))).filter(
    (d) => d.getUTCFullYear() === year
  );
  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...days.map((d) => d.toISOString().slice(0, 10)),
  ];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );

  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex gap-[3px]" role="img" aria-label={`Activity heatmap for ${year}`}>
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {week.map((d, i) => (
              <span
                key={i}
                title={d ? `${d}: ${(heat[d] ?? 0).toFixed(1)} km` : undefined}
                className={`size-3 rounded-[3px] ${d ? SHADES[level(heat[d] ?? 0)] : "bg-transparent"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
