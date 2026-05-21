---
title: Let moderators edit or clear a review note after the fact
---
# Let moderators edit or clear a review note after the fact

  ## What & Why
  Once a listing is approved or rejected with a note, there's currently no way to update or remove that note. A moderator might want to amend a typo, add more context, or clear a note that is no longer relevant — without re-doing the full approval/rejection cycle.

  ## Done looks like
  - From the admin listing detail modal, moderators can edit the review note for any already-approved or already-rejected listing
  - Clearing the field and saving removes the note from the seller's view
  - The PATCH /api/admin/listings/:id endpoint already accepts reviewNote — the change is purely in the UI

  ## Relevant files
  - `app/admin-panel.tsx` (ListingDetailModal — add an editable note field for non-pending listings)
  - `server/routes.ts` (PATCH /api/admin/listings/:id — verify it handles note-only updates without requiring a status change)