# Admin Database Editor & Profile Page Cleanup

## What & Why
Two separate changes:
1. The admin panel's Database tab currently only has sync tools (Scrydex, Asian sets, set visibility). Superadmins need a way to directly browse and edit raw database records — cards, sets, and user data — without needing external database access.
2. The "Download Card Database" button on the profile page is a developer tool that confuses regular users and is no longer needed now that the backend seeds data automatically; remove it.

## Done looks like

### Database editor (superadmin only)
- The Database tab gains a new "Browse & Edit" section beneath the existing sync tools
- Superadmins can switch between three record types: **Cards**, **Sets**, and **Users**
- **Cards view**: searchable/scrollable list of cards; tapping a card opens an edit sheet where every text field (name, number, rarity, set name, image URL, description) can be changed and saved via `PATCH /api/admin/db/cards/:id`
- **Sets view**: list of sets with name, language, and card count; tapping a set lets superadmins edit the set name, release date, and visibility, and see which cards belong to it
- **Users view**: supplements the existing Users tab — no duplication; links back to the Users tab for user edits
- All edits are validated server-side; the UI shows success/error feedback after each save
- Endpoints are protected by superadmin middleware (role === "superadmin")

### Profile page cleanup
- The `DatabaseSyncCard` component and all its supporting state/logic are removed from `app/(tabs)/profile.tsx`
- The profile page layout adjusts cleanly to fill the space left behind (remaining sections reflow naturally)

## Out of scope
- Bulk import/export of records
- Deleting cards or sets from the database (to prevent accidental data loss)
- Editing collection or market listing records directly

## Steps
1. **Server endpoints** — Add `GET /api/admin/db/cards` (paginated, searchable), `PATCH /api/admin/db/cards/:id`, `GET /api/admin/db/sets` (paginated), and `PATCH /api/admin/db/sets/:id`; protect all with superadmin middleware; validate input and return the updated record.
2. **Database editor UI** — Add a "Browse & Edit" collapsible section to the Database tab; build a search + list view for Cards and Sets; build an edit sheet (ScrollView of labeled TextInputs) that pre-fills current values and has Save / Cancel actions.
3. **Profile page cleanup** — Remove the `DatabaseSyncCard` component, its imports, and related AsyncStorage logic from `app/(tabs)/profile.tsx`; verify the rest of the profile screen still renders correctly.

## Relevant files
- `app/admin-panel.tsx:2356-2500`
- `app/(tabs)/profile.tsx`
- `server/routes.ts`
- `shared/schema.ts`
