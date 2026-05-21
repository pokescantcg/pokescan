---
title: Let admins undo accidental card or set deletions
---
# Let admins undo accidental card or set deletions

  ## What & Why
  Deletion is permanent and irreversible. Admins with fat-finger errors have no recovery path. A soft-delete approach (marking records as deleted rather than removing them) would let admins restore mistakenly deleted cards or sets.

  ## Done looks like
  - pokemon_cards and pokemon_sets tables gain a deleted_at TIMESTAMP column
  - DELETE endpoints set deleted_at instead of removing the row
  - All existing queries filter out rows where deleted_at IS NOT NULL
  - A "Restore" action appears in the DB browser for recently soft-deleted items (or a separate Trash view)

  ## Relevant files
  - `server/routes.ts` — DELETE /api/admin/db/cards/:id and DELETE /api/admin/db/sets/:id handlers
  - `server/schema.ts` — table definitions
  - `app/admin-panel.tsx` — DbBrowserSection, EditCardModal, EditSetModal