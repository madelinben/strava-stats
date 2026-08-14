import {
  LONG_RUN_KM_BY_WEEK,
  formatIsoDate,
  planWeekNumber,
  rulesForWeek,
  startOfMonday,
} from '../data/trainingPlan';
import type {
  ComplianceRule,
  ComplianceStatus,
  StravaActivitySummary,
  WeeklyCompliance,
} from '../types';

const SPEED_KEYWORDS = [
  'interval',
  'tempo',
  'speed',
  'track',
  '400',
  'reps',
  'repeats',
  'fartlek',
];

function isRun(a: StravaActivitySummary): boolean {
  const t = a.sport_type ?? a.type;
  return t === 'Run' || t === 'TrailRun' || t === 'VirtualRun';
}

function km(a: StravaActivitySummary): number {
  return a.distance / 1000;
}

function looksLikeSpeed(a: StravaActivitySummary): boolean {
  const name = a.name.toLowerCase();
  if (SPEED_KEYWORDS.some((k) => name.includes(k))) return true;
  // workout_type 3 = workout in Strava
  if (a.workout_type === 3) return true;
  // Fast average pace relative to easy (under ~5:15/km ≈ 3.175 m/s)
  if (a.average_speed >= 3.175 && km(a) >= 3 && km(a) <= 12) return true;
  return false;
}

function statusFrom(met: boolean, partial: boolean, weekComplete: boolean): ComplianceStatus {
  if (!weekComplete && !met) return 'pending';
  if (met) return 'met';
  if (partial) return 'partial';
  return 'missed';
}

export function computeWeeklyCompliance(
  activities: StravaActivitySummary[],
  now: Date = new Date(),
): WeeklyCompliance {
  const weekStart = startOfMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekNumber = planWeekNumber(now);
  const rulesDef = rulesForWeek(weekNumber);
  const weekStartIso = formatIsoDate(weekStart);
  const weekEndIso = formatIsoDate(weekEnd);

  const inWeek = activities.filter((a) => {
    const local = a.start_date_local.slice(0, 10);
    return local >= weekStartIso && local <= weekEndIso;
  });

  const runs = inWeek.filter(isRun);
  const longTarget = LONG_RUN_KM_BY_WEEK[weekNumber] ?? 0;
  const longestRunKm = runs.reduce((max, a) => Math.max(max, km(a)), 0);

  // Days with any activity
  const activeDays = new Set(inWeek.map((a) => a.start_date_local.slice(0, 10)));
  const restDays = 7 - activeDays.size;

  // Easy runs ≈ runs that aren't the longest and aren't speed
  const speedRuns = runs.filter(looksLikeSpeed);
  const easyRuns = runs.filter((a) => {
    if (looksLikeSpeed(a)) return false;
    // Treat longest as long run if it meets ≥70% of target
    if (longTarget > 0 && km(a) === longestRunKm && longestRunKm >= longTarget * 0.7) {
      return false;
    }
    return true;
  });

  const weekComplete = now > weekEnd;
  const rules: ComplianceRule[] = [];

  if (rulesDef.phaseId === 'off' || weekNumber < 1 || weekNumber > 30) {
    return {
      weekNumber,
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      phaseName: rulesDef.phaseName,
      rules: [
        {
          id: 'off-plan',
          label: 'Plan window',
          expected: 'Weeks 1–30 of Liverpool Half plan',
          actual: weekNumber < 1 ? 'Before plan start' : 'After race / plan end',
          status: 'pending',
        },
      ],
    };
  }

  const easyMet =
    easyRuns.length >= rulesDef.easyRunsMin ||
    (runs.length >= rulesDef.easyRunsMin && rulesDef.easyRunsMin > 0);
  const easyPartial = easyRuns.length > 0 || runs.length > 0;
  rules.push({
    id: 'easy',
    label: 'Easy runs',
    expected:
      rulesDef.easyRunsMin === 0
        ? 'Rest / race week — optional short easy'
        : `${rulesDef.easyRunsMin}–${rulesDef.easyRunsMax} easy runs`,
    actual: `${easyRuns.length} easy · ${runs.length} total runs`,
    status: statusFrom(
      rulesDef.easyRunsMin === 0 ? true : easyMet,
      easyPartial,
      weekComplete,
    ),
  });

  if (rulesDef.speedRequired) {
    const speedMet = speedRuns.length >= 1;
    rules.push({
      id: 'speed',
      label: 'Speed / tempo',
      expected: '1 speed or tempo session',
      actual: speedRuns.length
        ? `${speedRuns.length} session(s): ${speedRuns.map((r) => r.name).join(', ')}`
        : 'None detected',
      status: statusFrom(speedMet, false, weekComplete),
    });
  }

  if (longTarget > 0) {
    const longMet = longestRunKm >= longTarget * 0.95;
    const longPartial = longestRunKm >= longTarget * 0.7;
    rules.push({
      id: 'long',
      label: 'Long run',
      expected: `≥ ${longTarget} km`,
      actual: longestRunKm > 0 ? `${longestRunKm.toFixed(1)} km` : 'No run',
      status: statusFrom(longMet, longPartial, weekComplete),
    });
  } else {
    rules.push({
      id: 'long',
      label: 'Long run',
      expected: 'Race week — rest (no long run)',
      actual: longestRunKm > 0 ? `${longestRunKm.toFixed(1)} km` : 'None',
      status: statusFrom(longestRunKm === 0, longestRunKm < 8, weekComplete),
    });
  }

  const restMet = restDays >= rulesDef.restDaysMin;
  const restPartial = restDays >= Math.max(1, rulesDef.restDaysMin - 1);
  rules.push({
    id: 'rest',
    label: 'Rest days',
    expected: `≥ ${rulesDef.restDaysMin} rest / cross-train days`,
    actual: `${restDays} rest day(s)`,
    status: statusFrom(restMet, restPartial, weekComplete),
  });

  return {
    weekNumber,
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    phaseName: rulesDef.phaseName,
    rules,
  };
}
