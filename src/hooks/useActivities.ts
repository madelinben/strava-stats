import { queryOptions, useQuery } from "@tanstack/react-query";
import { type Activity, ensureFresh, fetchAllActivities, type Session } from "../lib/strava";

export const activitiesKey = (clientId: string) => ["strava", "activities", clientId] as const;

/** Refreshes the access token if needed (reporting the new session), then pages through all activities. */
export async function fetchActivities(session: Session, onSession: (s: Session) => void): Promise<Activity[]> {
  const fresh = await ensureFresh(session);
  if (fresh !== session) onSession(fresh);
  return fetchAllActivities(fresh.accessToken);
}

export const activitiesOptions = (session: Session, onSession: (s: Session) => void) =>
  queryOptions({
    queryKey: activitiesKey(session.clientId),
    queryFn: () => fetchActivities(session, onSession),
    staleTime: 15 * 60_000, // Strava allows 100 requests / 15 min; a full load is up to 10
    retry: false,
  });

export const useActivities = (session: Session, onSession: (s: Session) => void) => useQuery(activitiesOptions(session, onSession));
