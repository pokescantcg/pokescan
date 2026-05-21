---
title: Simplify market cards + listing detail modal
---
# Market Listing Card & Detail Redesign

## What & Why
The marketplace currently shows too much information on each listing card (badges, condition, description, photos, action buttons). The user wants a clean, minimal card list with a proper tap-to-expand detail view that shows only what the seller entered plus card data from the database — no external pricing info like "last sold".

## Done looks like
- Each listing card in the marketplace shows only: card image, card name, lister's username, and price (or "TRADE" label if a trade).
- Tapping any listing card opens a full-screen modal detail view.
- The detail modal shows:
  - Large card image at the top
  - Card name, set name, card number, and rarity (from the database — fetched by cardId)
  - A FOR SALE / TRADE badge
  - Price (if for sale)
  - Condition
  - Description (if provided)
  - External URL button (if provided), opens the URL in a browser
  - Seller's uploaded photos in a scrollable strip (if any)
  - A moderation status banner (owner only, shown when status is pending or rejected)
  - Action buttons at the bottom: "Message Seller" (non-owners), "Delete" (owner or staff), "Report" (non-owners)
- The delete button is moved off the list card and into the detail modal only.
- "Last sold" and any other externally-sourced pricing data are not shown anywhere in this flow.

## Out of scope
- Changing the listing creation form (card/[id].tsx)
- Admin panel moderation UI
- Any backend changes

## Steps
1. **Simplify ListingCard** — Replace the existing card body with a minimal 3-element row: small card image on the left, card name + lister name stacked in the middle, price/trade label right-aligned. Remove all action buttons, description, photos, status badges, and external URL button from the card row itself.

2. **Build ListingDetailModal** — Add a new modal component (as a bottom sheet or full-screen modal) inside market.tsx. Wire the `onPress` of each ListingCard to open this modal with the tapped listing. Inside the modal, fetch the full card record (using the listing's cardId) to get the card number field. Display all listing data and card data as described above. Place action buttons (message/delete/report) at the bottom of the modal.

3. **Move delete & report into modal** — Delete confirmation and report flow are triggered from buttons inside the modal. The card row itself has no delete/report controls.

## Relevant files
- `app/(tabs)/market.tsx`
- `lib/storage.ts:48-68`
- `shared/schema.ts:170-200`