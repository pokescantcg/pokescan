# Admin Activity & Reports Log Page

## What & Why
Admins currently have no way to see a chronological record of what moderators have done (approvals, rejections, note edits) or an overview of all submitted reports in one place. A dedicated Logs tab in the admin panel gives admins full visibility to audit moderation work and manage reports.

## Done looks like
- A new "Logs" tab appears in the admin panel (visible to admins and superadmins, not plain moderators)
- The Logs tab has two sub-sections, switchable by a toggle or segmented control:
  - **Moderation Activity**: a chronological list of actions taken on listings — who approved/rejected/edited a note, on which listing, and when; each row shows the listing name, action type, moderator username, and timestamp; tapping a row shows the listing detail
  - **All Reports**: a combined view of every report in the system (all statuses: pending, reviewed, dismissed); shows reporter name, listing name, reason, status, and date; moderators can mark a report as reviewed or dismissed directly from this view
- Both lists are paginated (load more on scroll) and can be filtered by date range and by moderator/reporter name
- The server exposes the data via new read-only endpoints: `GET /api/admin/activity-log` and `GET /api/admin/reports/all`

## Out of scope
- Exporting logs to CSV or email
- Push notifications to admins for new reports
- Logs for non-listing actions (e.g. role changes, account deletions) — future work

## Steps
1. **Activity log table** — Add a `pokescan_admin_activity_log` table (listing_id, action, performed_by, note, created_at) and write to it on every moderation action (approve, reject, note edit) in the existing PATCH endpoints.
2. **Log & reports endpoints** — Create `GET /api/admin/activity-log` (paginated, filterable by moderator and date) and `GET /api/admin/reports/all` (paginated, filterable by status) protected by staff middleware.
3. **Logs tab UI** — Add a "Logs" tab to the admin panel (admin/superadmin only) with a toggle between "Moderation Activity" and "All Reports"; each section is a `FlatList` with load-more pagination.
4. **Inline report actions** — In the All Reports section, add "Mark Reviewed" and "Dismiss" buttons on each report row that call the existing report update endpoint and refresh the list.

## Relevant files
- `app/admin-panel.tsx:1633-1693`
- `server/routes.ts`
- `shared/schema.ts`
- `lib/storage.ts`
