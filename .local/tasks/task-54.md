---
title: Let users share or add a card directly from scan history
---
# Let users share or add a card directly from scan history

  ## What & Why
  Users who browse recent scans often want to act on what they see — adding a card to their collection or sharing it. Right now tapping an entry only restores the scan result view; there's no shortcut action directly from the history list.

  ## Done looks like
  - A long-press (or swipe) on a history entry reveals quick actions: "Add to Collection" and "Share"
  - "Add to Collection" opens the same add flow as the main scanner result
  - History entries that are already in the collection show a checkmark badge

  ## Relevant files
  - `app/(tabs)/scanner.tsx` — history modal renderItem, histStyles
  - `lib/storage.ts` — ScanHistoryEntry interface