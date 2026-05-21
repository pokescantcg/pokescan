# Persistent Card Database with Pricing & eBay

## What & Why
Build a persistent PostgreSQL database that stores every Pokémon set, every card in each set (with images and details), realtime pricing (TCGPlayer, Cardmarket, GBP estimates from pokecardvalues.co.uk), and eBay sold listing prices. Right now everything is fetched live on demand — this creates slow load times, external API dependency for every screen view, and no eBay price history. The database becomes the source of truth, with background sync keeping it fresh.

## Done looks like
- All Pokémon sets and their full card lists are stored in the database
- Each card record includes name, number, rarity, supertype, image URLs (small & large), and set info
- Each card has a pricing record with TCGPlayer (low/mid/high/market), Cardmarket, and GBP estimated price
- eBay sold/listing prices are stored per card when available (fetched via the existing eBay URL generators + scraping sold results)
- A background sync service runs on server start and refreshes all sets/cards. Pricing refreshes on a schedule (every 24h)
- Existing API routes (`/api/pokemon/sets`, `/api/pokemon/sets/:id/cards`, `/api/pokemon/cards/:id`) serve data from the DB first, falling back to live API only if missing
- A `/api/sync/status` endpoint reports sync progress (total sets, cards synced, last sync time)
- A `/api/sync/trigger` POST endpoint allows manually triggering a full re-sync

## Out of scope
- Storing card images as binary blobs (store URLs only)
- Graded card pricing (PSA, BGS)
- Non-English card sets
- Real-time eBay websocket updates

## Tasks
<<<<<<< HEAD
1. **Database schema** — Add `pokemon_sets`, `pokemon_cards`, `card_pricing`, and `ebay_prices` tables to `shared/schema.ts` using Drizzle ORM, then push the schema to the database.
=======
1. **Database schema** — Add `pokescab_sets`, `pokescan_cards`, `card_pricing`, and `ebay_prices` tables to `shared/schema.ts` using Drizzle ORM, then push the schema to the database.
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

2. **Data sync service** — Create `server/card-sync.ts` that pulls all sets from the Pokemon TCG API, then iterates every set to fetch all cards (all pages), storing set and card records in the DB. Skip already-synced cards unless a force flag is passed.

3. **Pricing sync** — Extend the sync service to populate `card_pricing` for each card using the TCGPlayer/Cardmarket prices returned by the Pokemon TCG API, plus the GBP price from the existing pokecardvalues scraper. Run pricing refresh every 24 hours independently of a full card sync.

4. **eBay price sync** — For each card, use the existing `generateEbaySearchUrl` / `generateEbaySoldUrl` helpers to scrape sold listing prices from eBay UK and store them in the `ebay_prices` table. Throttle requests to avoid rate limiting.

5. **Updated API routes** — Modify existing `/api/pokemon/sets`, `/api/pokemon/sets/:id/cards`, and `/api/pokemon/cards/:id` routes to query the database first. Add `/api/sync/status` (GET) and `/api/sync/trigger` (POST) endpoints. Wire the sync service to start automatically when the server boots.

## Relevant files
- `shared/schema.ts`
- `server/routes.ts`
- `server/pokecardvalues-scraper.ts`
- `server/index.ts`
- `shared/models/chat.ts`
