/**
 * Regenerate public/data/parkruns.json from parkrun's public events feed.
 * Free, no API key. Run occasionally when new events launch:
 *   pnpm run parkruns:update
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'data', 'parkruns.json');
const SOURCE = 'https://images.parkrun.com/events.json';
const UK_IE = new Set([97, 42]);

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: {
    eventname: string;
    EventShortName: string;
    EventLocation: string;
    countrycode: number;
    seriesid: number;
  };
}

async function main(): Promise<void> {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Failed to fetch ${SOURCE}: ${res.status}`);
  const raw = (await res.json()) as {
    countries: Record<string, { url: string }>;
    events: { features: Feature[] };
  };

  const countryBase = (code: number): string => {
    const c = raw.countries[String(code)];
    return c?.url ? `https://${c.url}` : 'https://www.parkrun.org.uk';
  };

  const features = raw.events.features.filter((f) => f.properties.seriesid === 1);

  const toEvent = (f: Feature) => {
    const [lng, lat] = f.geometry.coordinates;
    const name = f.properties.EventShortName;
    const cc = f.properties.countrycode;
    return {
      name,
      slug: f.properties.eventname,
      letter: name.trim().charAt(0).toUpperCase(),
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      location: f.properties.EventLocation || '',
      country: cc === 97 ? 'UK' : cc === 42 ? 'IE' : 'INT',
      url: `${countryBase(cc)}/${f.properties.eventname}/`,
    };
  };

  const ukIe = features.filter((f) => UK_IE.has(f.properties.countrycode)).map(toEvent);
  const zWorld = features
    .filter((f) => !UK_IE.has(f.properties.countrycode))
    .map(toEvent)
    .filter((e) => e.letter === 'Z');

  const events = [...ukIe, ...zWorld]
    .filter((e) => /^[A-Z]$/.test(e.letter))
    .sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    region: 'UK + Ireland (+ worldwide Z)',
    source: SOURCE,
    notes:
      'Senior 5k events only. Letter = first character of EventShortName. No X events currently exist worldwide.',
    events,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out), 'utf8');
  console.log(`Wrote ${events.length} events → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
