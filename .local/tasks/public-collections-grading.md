# Public Collections, Card Grading & Verified Collector Badge

## What & Why
Currently collections are private. This task opens up three related features:
1. Members can opt in to making their collection visible to others, and a "Collections" browse page lets anyone discover them.
2. Members can record graded cards in their collection (PSA, Beckett, ACE, CGC) alongside raw cards.
3. Members who want a "Verified Collector" badge can submit photos of a graded card for admin review.

## Done looks like

### Public collections toggle & browse page
- A toggle on the collection screen (or profile settings) lets users make their collection public or private (default: private)
- A new "Collections" page (accessible from the Browse tab or a dedicated tab entry) lists all members who have opted in to public collections; each row shows their avatar, username, card count, and total portfolio value
- Tapping a member opens a read-only view of their collection (same layout as the user's own collection screen)

### Grading support on collection entries
- When adding or editing a card in the collection, users see optional grading fields: a "Grading Company" picker (None, PSA, Beckett, ACE, CGC) and a "Grade" input (numeric 1–10, or sub-grades for Beckett like 9.5)
- Graded cards show a badge on the card tile (e.g. "PSA 10") in both the private and public collection view
- The database schema adds `grading_company` (varchar, nullable) and `grade` (varchar, nullable) columns to `pokescan_collections`

### Verified Collector Badge
- Users can apply for the badge from their profile page; the application requires them to select a card already in their collection and upload a front + back photo of the physical card
- The application is submitted to admins via a new `pokescan_collector_verifications` table; it shows up in the admin Users tab with an "Applications" sub-section
- Admins can approve or reject the application; approved users get a "Verified Collector" badge displayed on their profile and next to their username in the public collections list
- The `pokescan_users` table gains an `is_verified_collector` boolean column (default false)

## Out of scope
- Automated grading verification (photos are reviewed manually by admins)
- Social following / liking other members' collections
- Graded card price data (handled by a separate task)

## Steps
1. **Schema changes** — Add `is_public` (boolean, default false) to `pokescan_collections`; add `grading_company` and `grade` (varchar, nullable) to `pokescan_collections`; add `is_verified_collector` (boolean, default false) to `pokescan_users`; create `pokescan_collector_verifications` table (id, user_id, card_id, front_photo, back_photo, status, reviewed_by, reviewed_at, created_at).
2. **Collection privacy toggle** — Add a public/private toggle to the collection screen header and wire it to a `PATCH /api/collection/privacy` endpoint.
3. **Grading fields on add/edit** — Extend the add-to-collection modal and any edit flow to include the grading company picker and grade input; store and return these fields from all collection API endpoints.
4. **Public collections browse page** — Add `GET /api/collections/public` endpoint (paginated list of users with public collections + stats); build the browse screen with search by username; tapping opens a read-only collection view using existing collection components.
5. **Verified Collector application flow** — Build a submission screen (card selector + camera/photo picker for front/back); create `POST /api/collector-verification` and `GET /api/admin/collector-verifications` endpoints; add an "Applications" section to the admin Users tab with approve/reject actions that flip `is_verified_collector` and update the verification record.
6. **Badge display** — Show the verified badge icon on profile screens and in the public collections list.

## Relevant files
- `app/(tabs)/collection.tsx`
- `app/(tabs)/profile.tsx`
- `app/admin-panel.tsx`
- `server/routes.ts`
- `shared/schema.ts`
- `lib/storage.ts`
- `lib/user-context.tsx`
