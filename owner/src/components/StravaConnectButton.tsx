import { useState } from 'react';
import { StravaSetupModal } from './StravaSetupModal';

/** Shown in place of the dev toolbar whenever dashboard.json can't be loaded —
 * i.e. Strava hasn't been connected yet for this checkout/fork. */
export function StravaConnectButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="dev-toolbar">
      <button
        type="button"
        className="dev-circle-btn"
        onClick={() => setOpen(true)}
        title="Connect Strava"
        aria-label="Connect Strava"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </button>

      {open ? <StravaSetupModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
