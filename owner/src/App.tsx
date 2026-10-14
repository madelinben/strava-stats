import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from './types';
import { Hero } from './components/Hero';
import { Heatmap } from './components/Heatmap';
import { StatCard } from './components/StatCard';
import { GroupCards } from './components/GroupCards';
import { TrainingPlan } from './components/TrainingPlan';
import { ComplianceCard } from './components/ComplianceCard';
import { AlphabeteerFinder } from './components/AlphabeteerFinder';
import { AchievementBadges } from './components/AchievementBadges';
import { DevToolbar } from './components/DevToolbar';
import { StravaConnectButton } from './components/StravaConnectButton';
import { UpcomingEventsCarousel, PastEventsCarousel } from './components/EventsCarousel';
import { SportPanel } from './components/SportPanel';
import { MapAndHeatmapSection } from './components/MapAndHeatmapSection';
import { YearNav } from './components/YearNav';
import { useEvents } from './hooks/useEvents';
import { eventRegions, matchedActivityIds, sortEvents } from './lib/events';
import {
  aggregateByIds,
  aggregateSport,
  bucketForSport,
  MAP_BUCKET_IDS,
  pointsForIds,
  routesForIds,
  tabsFromActivityLog,
} from './lib/sports';
import { buildTrainingPlan, pickMilestone } from './lib/trainingPlan';

const SPORT_COLORS = {
  Run: '#10b981',
  Ride: '#3b82f6',
  Hike: '#a855f7',
} as const;

// Leaflet's renderer doesn't resolve CSS custom properties, so map pins need
// literal hex — mirrors the --<bucket> values in index.css.
const BUCKET_HEX: Record<string, string> = {
  run: '#10b981',
  ride: '#3b82f6',
  walk: '#f97316',
  hike: '#a855f7',
  rowing: '#06b6d4',
  soccer: '#eab308',
  padel: '#ec4899',
  triathlon: '#8b5cf6',
  other: '#64748b',
};

async function fetchDashboard(): Promise<DashboardData> {
  const url = `${import.meta.env.BASE_URL}data/dashboard.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not load dashboard data (${res.status}). Run npm run sync (or copy public/data/dashboard.sample.json → dashboard.json).`,
    );
  }
  return res.json() as Promise<DashboardData>;
}

export default function App() {
  const [tab, setTab] = useState('run');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allTime, setAllTime] = useState(false);
  const { events, addEvent, removeEvent, toggleMilestone } = useEvents();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const plan = useMemo(() => {
    const milestone = pickMilestone(events, new Date());
    const longestRunKm = data
      ? Math.max(
          0,
          ...(data.years.all?.activityLog ?? [])
            .filter((a) => bucketForSport(a.type).id === 'run')
            .map((a) => a.distanceKm),
        )
      : 0;
    return buildTrainingPlan(milestone, longestRunKm, new Date());
  }, [events, data]);

  if (isPending) {
    return (
      <div className="page-state">
        <h1>Loading dashboard…</h1>
        <p>Fetching the daily snapshot.</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page-state">
        <StravaConnectButton />
        <h1>Strava not connected yet</h1>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        <p className="muted">
          Click the profile icon (top left) to connect your Strava account and pull in your
          activity history.
        </p>
      </div>
    );
  }

  const generated = new Date(data.generatedAt).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const year = selectedYear ?? data.currentYear;
  const activeYear = allTime
    ? (data.years.all ?? data.years[String(data.currentYear)])
    : (data.years[String(year)] ?? data.years[String(data.currentYear)]);

  const activityLog = activeYear.activityLog ?? [];
  const allActivityLog = data.years.all?.activityLog ?? [];
  const allRunPoints = data.years.all?.pointsByBucket['run'] ?? [];
  const { upcoming, past } = sortEvents(events);
  const tabs = tabsFromActivityLog(activityLog, events);
  const activeTab = tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? 'run');

  // Triathlon has no native Strava activity type — its tab is built from
  // whichever hike/ride/rowing legs match a Triathlon-tagged tracked event on
  // the same day, rather than filtering activityLog by type.
  const triathlonIds = matchedActivityIds('triathlon', events, activityLog);
  const otherAggregate =
    activeTab === 'triathlon'
      ? aggregateByIds(activityLog, triathlonIds)
      : aggregateSport(activityLog, activeTab);
  const otherPoints =
    activeTab === 'triathlon'
      ? pointsForIds(activeYear.pointsByBucket, triathlonIds)
      : (activeYear.pointsByBucket[activeTab] ?? []);
  const otherRoutes =
    activeTab === 'triathlon'
      ? routesForIds(activeYear.routesByBucket, triathlonIds)
      : (activeYear.routesByBucket[activeTab] ?? []);
  const otherRegions =
    activeTab === 'triathlon'
      ? eventRegions('triathlon', events, activityLog)
      : (activeYear.regionsByBucket[activeTab] ?? []);

  return (
    <div className="wrap">
      <DevToolbar onAddEvent={addEvent} />
      <Hero athlete={data.athlete} plan={plan} summary={activeYear.summary} />
      <AchievementBadges activityLog={allActivityLog} events={events} runPoints={allRunPoints} />

      <section id="heatmap-section">
        <h2 className="section-header-with-nav">
          Past year activity
          <YearNav
            year={year}
            availableYears={data.availableYears}
            onChange={setSelectedYear}
            allTime={allTime}
            onToggleAllTime={setAllTime}
          />
        </h2>
        <div className="card">
          <Heatmap
            days={data.years[String(year)]?.heatmap ?? []}
            year={year}
            activityLog={data.years[String(year)]?.activityLog ?? []}
          />
          <p className="muted">
            Intensity: lighter = 1 activity, darker = 2+ activities per day. Grey =
            no activity logged. Showing {data.years[String(year)]?.summary.dateRange ?? '—'}.
          </p>
        </div>
      </section>

      <UpcomingEventsCarousel
        events={upcoming}
        activityLog={activityLog}
        onRemove={removeEvent}
        onToggleMilestone={toggleMilestone}
      />

      <nav className="tabs" role="tablist" aria-label="Activity type">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab-btn${activeTab === t.id ? ' is-active' : ''}`}
            style={{ '--tab-color': t.color } as React.CSSProperties}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'run' ? (
        <div role="tabpanel">
          <PastEventsCarousel
            events={past.filter((e) => bucketForSport(e.activityType).id === 'run')}
            activityLog={activityLog}
            onRemove={removeEvent}
            onToggleMilestone={toggleMilestone}
            title="Past running events"
          />

          <section id="compliance">
            <h2>This week vs plan</h2>
            <ComplianceCard compliance={data.compliance} />
          </section>

          <section id="running-stats">
            <h2>Running stats</h2>
            <div className="grid grid-3" style={{ marginBottom: 14 }}>
              <StatCard
                label="Activities logged"
                value={String(activeYear.summary.runs)}
                sub="Runs"
              />
              <StatCard
                label="Total distance"
                value={`${activeYear.summary.runDistanceKm} km`}
                sub={`${activeYear.summary.runs} runs`}
              />
              <StatCard
                label="Total time running"
                value={activeYear.running.totalTime.value}
                sub={activeYear.running.totalTime.sub}
              />
              {(activeYear.running.distancePbs ?? []).map((pb) => (
                <StatCard
                  key={pb.id}
                  label={pb.label}
                  value={pb.value}
                  pace={pb.pace !== '—' ? pb.pace : undefined}
                  sub={pb.sub}
                />
              ))}
              <StatCard
                label="Furthest run"
                value={activeYear.running.furthest.value}
                sub={activeYear.running.furthest.sub}
              />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Trainer wear estimate</h3>
              <div className="shoe-wear">
                <div style={{ minWidth: 90, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {activeYear.running.shoeWear.loggedKm} km logged
                </div>
                <div className="wear-bar-bg">
                  <div
                    className="wear-bar-fill"
                    style={{ width: `${activeYear.running.shoeWear.percent}%` }}
                  />
                </div>
                <div style={{ minWidth: 130, fontSize: 13, color: 'var(--text-secondary)' }}>
                  ~{activeYear.running.shoeWear.percent}% of{' '}
                  {activeYear.running.shoeWear.lifeKm} km life
                </div>
              </div>
              <p className="muted">
                Uses total logged running distance against a typical{' '}
                {activeYear.running.shoeWear.lifeKm} km road shoe lifespan as a proxy.
                Link a shoe in Strava gear settings for an exact reading.
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <AlphabeteerFinder runPoints={(activeYear.pointsByBucket['run'] ?? [])} />
            </div>
          </section>

          <section id="group-stats">
            <h2>Running group stats</h2>
            <GroupCards groups={activeYear.groups} />
          </section>

          <MapAndHeatmapSection
            idPrefix="running"
            label="Running"
            points={activeYear.pointsByBucket['run'] ?? []}
            routes={activeYear.routesByBucket['run'] ?? []}
            regions={activeYear.regionsByBucket['run'] ?? []}
            markerColor={SPORT_COLORS.Run}
          />

          <TrainingPlan analysis={data.analysis} plan={plan} />
        </div>
      ) : null}

      {activeTab === 'ride' ? (
        <div role="tabpanel">
          <PastEventsCarousel
            events={past.filter((e) => bucketForSport(e.activityType).id === 'ride')}
            activityLog={activityLog}
            onRemove={removeEvent}
            onToggleMilestone={toggleMilestone}
            title="Past cycling events"
          />

          <section id="cycling-stats">
            <h2>Cycling stats</h2>
            <div className="grid grid-4">
              <StatCard
                label="Activities logged"
                value={String(activeYear.summary.rides)}
                sub="Rides"
              />
              <StatCard
                label="Furthest ride"
                value={activeYear.cycling.furthest.value}
                sub={activeYear.cycling.furthest.sub}
              />
              <StatCard
                label="Longest ride (time)"
                value={activeYear.cycling.longestTime.value}
                sub={activeYear.cycling.longestTime.sub}
              />
              <StatCard
                label="Total time on the bike"
                value={activeYear.cycling.totalTime.value}
                sub={activeYear.cycling.totalTime.sub}
              />
              <StatCard
                label="Total distance"
                value={activeYear.cycling.totalDistance.value}
                sub={activeYear.cycling.totalDistance.sub}
              />
            </div>
          </section>

          <MapAndHeatmapSection
            idPrefix="cycling"
            label="Cycling"
            points={activeYear.pointsByBucket['ride'] ?? []}
            routes={activeYear.routesByBucket['ride'] ?? []}
            regions={activeYear.regionsByBucket['ride'] ?? []}
            markerColor={SPORT_COLORS.Ride}
          />
        </div>
      ) : null}

      {activeTab === 'hike' ? (
        <div role="tabpanel">
          <PastEventsCarousel
            events={past.filter((e) => bucketForSport(e.activityType).id === 'hike')}
            activityLog={activityLog}
            onRemove={removeEvent}
            onToggleMilestone={toggleMilestone}
            title="Past hiking events"
          />

          <section id="hiking-stats">
            <h2>Hiking stats</h2>
            <div className="grid grid-4">
              <StatCard
                label="Activities logged"
                value={String(activeYear.summary.hikes)}
                sub="Hikes"
              />
              <StatCard
                label="Total distance"
                value={activeYear.hiking.totalDistance.value}
                sub={activeYear.hiking.totalDistance.sub}
              />
              <StatCard
                label="Highest elevation gain"
                value={activeYear.hiking.highestElevation.value}
                sub={activeYear.hiking.highestElevation.sub}
              />
              <StatCard
                label="Favourite location"
                value={activeYear.hiking.favouriteLocation.value}
                sub={activeYear.hiking.favouriteLocation.sub}
              />
              <StatCard
                label="Furthest hike"
                value={activeYear.hiking.furthest.value}
                sub={activeYear.hiking.furthest.sub}
              />
              <StatCard
                label="Total time hiking"
                value={activeYear.hiking.totalTime.value}
                sub={activeYear.hiking.totalTime.sub}
              />
            </div>
          </section>

          <MapAndHeatmapSection
            idPrefix="hiking"
            label="Hiking"
            points={activeYear.pointsByBucket['hike'] ?? []}
            routes={activeYear.routesByBucket['hike'] ?? []}
            regions={activeYear.regionsByBucket['hike'] ?? []}
            markerColor={SPORT_COLORS.Hike}
          />
        </div>
      ) : null}

      {activeTab !== 'run' && activeTab !== 'ride' && activeTab !== 'hike' ? (
        <div role="tabpanel">
          <PastEventsCarousel
            events={past.filter((e) => bucketForSport(e.activityType).id === activeTab)}
            activityLog={activityLog}
            onRemove={removeEvent}
            onToggleMilestone={toggleMilestone}
            title={`Past ${tabs.find((t) => t.id === activeTab)?.label.toLowerCase() ?? ''} events`}
          />

          <SportPanel
            label={tabs.find((t) => t.id === activeTab)?.label ?? activeTab}
            aggregate={otherAggregate}
          />

          {MAP_BUCKET_IDS.has(activeTab) ? (
            <MapAndHeatmapSection
              idPrefix="other"
              label={tabs.find((t) => t.id === activeTab)?.label ?? activeTab}
              points={otherPoints}
              routes={otherRoutes}
              regions={otherRegions}
              markerColor={BUCKET_HEX[activeTab] ?? BUCKET_HEX.other}
            />
          ) : null}
        </div>
      ) : null}

      <footer>
        Strava dashboard generated from your activity history · {allTime ? 'All time' : year}
        : {activeYear.summary.activities} activities · {activeYear.summary.dateRange}
        <br />
        Snapshot updated {generated} · browser never calls Strava (daily sync only)
      </footer>
    </div>
  );
}
