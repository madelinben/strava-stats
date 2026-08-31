import type { IconType } from 'react-icons';
import {
  MdDirectionsBike,
  MdDirectionsRun,
  MdDirectionsWalk,
  MdEmojiEvents,
  MdFitnessCenter,
  MdRowing,
  MdSportsSoccer,
  MdSportsTennis,
  MdTerrain,
} from 'react-icons/md';

/** Icon per sport-bucket id (see lib/sports.ts) — shown white on the bucket's
 * colour everywhere a sport needs a glyph instead of a two-letter initial. */
const SPORT_ICONS: Record<string, IconType> = {
  run: MdDirectionsRun,
  ride: MdDirectionsBike,
  walk: MdDirectionsWalk,
  hike: MdTerrain,
  rowing: MdRowing,
  soccer: MdSportsSoccer,
  padel: MdSportsTennis,
  triathlon: MdEmojiEvents,
};

export function sportIcon(bucketId: string): IconType {
  return SPORT_ICONS[bucketId] ?? MdFitnessCenter;
}
