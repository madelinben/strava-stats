/** Contract with the sticker maker (@get-out-there/tool-stickers): same key + shape, no package dependency. */
export const HANDOFF_KEY = "gotc:sticker-handoff";

export type Handoff = {
  title: string;
  distanceM: number;
  durationS: number | null;
  elevGainM: number | null;
  points: { lat: number; lon: number; ele: number | null; time: number | null }[];
};
