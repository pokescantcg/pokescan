# Admin Panel Dropdown Navigation

## What & Why
The admin panel currently uses horizontal scrolling text buttons for tab switching and rows of filter buttons inside each tab. On smaller phones these are cramped and hard to tap accurately. Replace the main tab bar with a compact dropdown picker and convert the listing status filter into a segmented picker so the panel feels cleaner and more professional.

## Done looks like
- The tab row at the top of the admin panel is replaced by a styled dropdown (Modal-based picker or ActionSheet) that shows the current tab name with a chevron icon; tapping it opens the list of available tabs (Listings, Users, Reports, Revenue, Database — with the same role-based visibility rules as before)
- The Listings tab's "Pending / Approved / Rejected / All" filter row is replaced by a compact horizontal segmented control (or a second dropdown) so no text overflows on small screens
- The Database tab's visibility filter ("All / Visible / Hidden") and language filter are similarly replaced by dropdowns
- All existing functionality (tab content, role restrictions, filters) works exactly the same — only the navigation chrome changes
- The dropdown closes automatically when a selection is made

## Out of scope
- Redesigning the content inside each tab
- Changing which tabs exist or who can access them
- Any changes to the Users tab action buttons

## Steps
1. **Dropdown component** — Build a reusable `AdminDropdown` component (self-contained, Modal + FlatList) that accepts `options`, `value`, `onChange`, and `colors` props; style it to match the dark admin panel theme.
2. **Replace main tab selector** — Swap the `ScrollView` of `Pressable` tab buttons with the `AdminDropdown` showing the active tab name; keep all `isSuperadminUser` visibility guards intact.
3. **Replace Listings filter** — Replace the 4-button status row with either a compact `AdminDropdown` or a scrollable pill row that fits on one line without overflow.
4. **Replace Database filters** — Replace the visibility and language filter button rows in the Database tab with `AdminDropdown` pickers.

## Relevant files
- `app/admin-panel.tsx:1633-1693`
- `app/admin-panel.tsx:1709-1748`
- `app/admin-panel.tsx:2400-2440`
