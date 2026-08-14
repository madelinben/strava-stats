import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from './types';
import { Hero } from './components/Hero';
import { Heatmap } from './components/Heatmap';
import { StatCard } from './components/StatCard';
import { GroupCards } from './components/GroupCards';
import { ActivityMap } from './components/ActivityMap';
import { TrainingPlan } from './components/TrainingPlan';
import { ComplianceCard } from './components/ComplianceCard';

const SPORT_COLORS = {
  Run: '#10b981',
  Ride: '#3b82f6',
  Hike: '#a855f7',
} as const;

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
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

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
        <h1>Dashboard unavailable</h1>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  const generated = new Date(data.generatedAt).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="wrap">
      <Hero data={data} />

      <section id="heatmap-section">
        <h2>Past year activity</h2>
        <div className="card">
          <Heatmap days={data.heatmap} />
          <p className="muted">
            Intensity: lighter = 1 activity, darker = 2+ activities per day. Grey =
            no activity logged.
          </p>
        </div>
      </section>

      <section id="compliance">
        <h2>This week vs plan</h2>
        <ComplianceCard compliance={data.compliance} />
      </section>

      <section id="running-stats">
        <h2>Running stats</h2>
        <div className="grid grid-3" style={{ marginBottom: 14 }}>
          <StatCard
            label="Furthest run"
            value={data.running.furthest.value}
            sub={data.running.furthest.sub}
          />
          <StatCard
            label="Quickest 5k"
            value={data.running.quickest5k.value}
            sub={data.running.quickest5k.sub}
          />
          <StatCard
            label="Quickest 10k"
            value={data.running.quickest10k.value}
            sub={data.running.quickest10k.sub}
          />
          <StatCard
            label="Total time running"
            value={data.running.totalTime.value}
            sub={data.running.totalTime.sub}
          />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Trainer wear estimate</h3>
          <div className="shoe-wear">
            <div style={{ minWidth: 90, fontSize: 13, color: 'var(--text-secondary)' }}>
              {data.running.shoeWear.loggedKm} km logged
            </div>
            <div className="wear-bar-bg">
              <div
                className="wear-bar-fill"
                style={{ width: `${data.running.shoeWear.percent}%` }}
              />
            </div>
            <div style={{ minWidth: 130, fontSize: 13, color: 'var(--text-secondary)' }}>
              ~{data.running.shoeWear.percent}% of {data.running.shoeWear.lifeKm} km
              life
            </div>
          </div>
          <p className="muted">
            Uses total logged running distance against a typical{' '}
            {data.running.shoeWear.lifeKm} km road shoe lifespan as a proxy. Link a
            shoe in Strava gear settings for an exact reading.
          </p>
        </div>
      </section>

      <section id="group-stats">
        <h2>Running group stats</h2>
        <GroupCards groups={data.groups} />
      </section>

      <section id="running-map">
        <h2>Running location map</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ActivityMap points={data.runPoints} color={SPORT_COLORS.Run} />
        </div>
        <p className="muted">
          {data.runPoints.length} starting locations pinned · map tiles © OpenStreetMap
          contributors
        </p>
      </section>

      <TrainingPlan analysis={data.analysis} focus={data.focus} />

      <section id="cycling-stats">
        <h2>Cycling stats</h2>
        <div className="grid grid-4">
          <StatCard
            label="Furthest ride"
            value={data.cycling.furthest.value}
            sub={data.cycling.furthest.sub}
          />
          <StatCard
            label="Longest ride (time)"
            value={data.cycling.longestTime.value}
            sub={data.cycling.longestTime.sub}
          />
          <StatCard
            label="Total time on the bike"
            value={data.cycling.totalTime.value}
            sub={data.cycling.totalTime.sub}
          />
          <StatCard
            label="Total distance"
            value={data.cycling.totalDistance.value}
            sub={data.cycling.totalDistance.sub}
          />
        </div>
      </section>

      <section id="cycling-map">
        <h2>Cycling location map</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ActivityMap points={data.ridePoints} color={SPORT_COLORS.Ride} />
        </div>
        <p className="muted">
          {data.ridePoints.length} starting locations pinned · map tiles © OpenStreetMap
          contributors
        </p>
      </section>

      <section id="hiking-stats">
        <h2>Hiking stats</h2>
        <div className="grid grid-4">
          <StatCard
            label="Highest elevation gain"
            value={data.hiking.highestElevation.value}
            sub={data.hiking.highestElevation.sub}
          />
          <StatCard
            label="Favourite location"
            value={data.hiking.favouriteLocation.value}
            sub={data.hiking.favouriteLocation.sub}
          />
          <StatCard
            label="Furthest hike"
            value={data.hiking.furthest.value}
            sub={data.hiking.furthest.sub}
          />
          <StatCard
            label="Total time hiking"
            value={data.hiking.totalTime.value}
            sub={data.hiking.totalTime.sub}
          />
        </div>
      </section>

      <section id="hiking-map">
        <h2>Hiking location map</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ActivityMap points={data.hikePoints} color={SPORT_COLORS.Hike} />
        </div>
        <p className="muted">
          {data.hikePoints.length} starting locations pinned · map tiles © OpenStreetMap
          contributors
        </p>
      </section>

      <footer>
        Strava dashboard generated from your activity history ·{' '}
        {data.summary.activities} activities · {data.summary.dateRange}
        <br />
        Snapshot updated {generated} · browser never calls Strava (daily sync only)
      </footer>
    </div>
  );
}
