---
title: Fix message header buttons & unread badge
---
# Fix Message Header & Unread Badge

## What & Why
Two bugs reported from the live app:
1. In the message detail view, the flag, reply, and trash buttons sit directly behind the phone's status bar, making them hard or impossible to tap.
2. The red unread-message badge on the profile tab stays even after messages have been read or deleted — it only refreshes when the app is cold-started.

## Done looks like
- Opening a message shows the header buttons (flag, reply, trash) fully below the status bar with correct spacing on all Android and iOS devices.
- After reading or deleting a message and returning to the profile tab, the red badge count either decrements or disappears without requiring an app restart.

## Out of scope
- Redesigning the message layout beyond the header padding fix.
- Real-time push notifications or live badge updates via websockets.

## Steps
1. **Fix message detail header insets** — The `MessageDetailModal` component uses `styles.composeHeader` which has fixed vertical padding and no safe-area awareness. Add `useSafeAreaInsets` inside `MessageDetailModal` and apply `insets.top` to the top padding of the header view so buttons always appear below the status bar.

2. **Fix stale unread badge on profile** — The profile screen fetches the unread count once on mount and never again. Replace the `useEffect` with `useFocusEffect` (from `expo-router`) so the count is re-fetched every time the profile tab comes into focus. This ensures reads and deletions done in the messages screen are reflected immediately when the user returns.

## Relevant files
- `app/messages.tsx:120-135,253-291,1135`
- `app/(tabs)/profile.tsx:52,68-72,407-410`