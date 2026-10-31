# strava-stats

## Mobile-first rules

This site is mobile first. Design and verify at ~375px width before desktop.

- Base CSS targets mobile; widen with `min-width` queries where possible.
- Nothing may overflow the viewport horizontally. No page-level horizontal scroll.
- Wide content (tab bars, tables, chip rows, maps) scrolls inside its own `width: 100%; max-width: 100%; overflow-x: auto` container, with `flex: 0 0 auto; white-space: nowrap` on its items.
- No fixed pixel widths wider than the mobile viewport; use `max-width` + `width: 100%`.
- Touch targets at least 40px tall.
- Check new UI in a 375px viewport before calling it done.
