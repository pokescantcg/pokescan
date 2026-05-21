---
title: Show a confidence indicator on every scan result so users know how reliable it is
---
# Show a confidence indicator on every scan result so users know how reliable it is

  ## What & Why
  The retake banner now appears for low/medium confidence scans, but the IdentificationCard and DatabaseMatchCard components don't visually convey confidence level when a result IS shown. A small coloured badge (green/amber) on the result card helps users instantly understand whether to trust the identification without having to interpret the JSON confidence field themselves.

  ## Done looks like
  - The confidence badge already exists in IdentificationCard (idCard styles) but is shown unconditionally — ensure it is visually prominent and colour-coded: green for "high", amber for "medium", red for "low"
  - DatabaseMatchCard (which replaces IdentificationCard when a DB match is found) also shows the same badge
  - The badge is shown on the scan result regardless of whether the retake banner is also showing

  ## Relevant files
  - `app/(tabs)/scanner.tsx` — IdentificationCard component (around line 450–550), DatabaseMatchCard component, idCard/confidenceBadge styles