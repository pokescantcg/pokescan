# PokeScan TCG

## Overview

PokeScan TCG is a Pokémon Trading Card Game companion app built with Expo (React Native) for the frontend and Express.js for the backend. The app allows users to browse Pokémon card sets, search/scan cards, track their card collection with pricing in GBP, and participate in a marketplace for trading and selling cards. It includes user registration, premium membership, and an admin panel for moderation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: expo-router with file-based routing (`app/` directory). Tab navigation with 5 tabs: Browse, Scan, Collection, Market, Profile
- **State Management**: React Context (`UserProvider` in `lib/user-context.tsx`) for user state, collection, and listings. TanStack React Query for server data fetching and caching
- **Local Storage**: AsyncStorage (`@react-native-async-storage/async-storage`) for persisting user profiles, collections, market listings, and admin credentials locally on device
- **Styling**: StyleSheet-based with dynamic theming (dark/light mode support via `useColorScheme`). Theme colors defined in `constants/colors.ts` with a dark Pokemon-themed palette as primary
- **Fonts**: Google Fonts (Outfit family) loaded via `@expo-google-fonts/outfit`
- **Key UI Libraries**: expo-image, expo-linear-gradient, expo-blur, expo-haptics, react-native-reanimated, react-native-gesture-handler

### Screen Structure
- `app/(tabs)/index.tsx` — Browse Pokémon card sets with language category selector (English 🇬🇧, Japanese 🇯🇵, Korean 🇰🇷, Chinese 🇨🇳). First screen shows language grid; selecting a language shows filtered sets. Language is detected from set ID by `detectLanguage()`: `_ja` suffix → Japanese, `_ko` → Korean, `_zh`/`_cn` → Chinese, `me*`/`zsv*`/`rsv*` prefix (followed by digit) → Chinese, everything else → English. Language categories with no matching sets show the scanner CTA; ones with sets show the browseable set list.
- `app/(tabs)/scanner.tsx` — Search/scan cards (text search + image picker). Has two modes: **Identify** (AI card scan, text search) and **Grade** (premium-only card grading tool — rates Centering/Corners/Edges/Surface on 0–5 scale, calls `/api/grade`, returns PSA-style grade with colour-coded result card)
- `app/(tabs)/collection.tsx` — User's card collection with values
- `app/(tabs)/market.tsx` — Marketplace for trading/selling cards
- `app/(tabs)/profile.tsx` — User profile, stats, premium info, profile picture upload (premium only)
- `app/set/[id].tsx` — Set detail: 3-column image grid using TCG API cards (complete list with images, infinite scroll, direct navigation to `/card/[id]`). Receives `{ id: tcgSetId, name }` params from Browse tab
- `app/card/[id].tsx` — Individual card detail with pricing and add-to-collection
- `app/register.tsx` — User registration modal
- `app/admin-login.tsx` — Admin/moderator login
- `app/admin-panel.tsx` — Admin panel for managing listings and users

### Backend (Express.js)
- **Runtime**: Node.js with TypeScript (compiled via tsx for dev, esbuild for production)
- **Server location**: `server/index.ts` (entry point), `server/routes.ts` (API routes)
- **Purpose**: Acts as a proxy to the Pokémon TCG API and serves the static web build in production
- **CORS**: Configured for Replit domains and localhost development
- **API routes are all proxy endpoints** — no direct database-backed API routes for the main app features yet

### Local Card Cache (`lib/card-cache.ts`)
- `syncDatabase(onProgress)` — downloads all cards from all sets via `/api/pokemon/sets/:setId/all-cards` and stores in AsyncStorage. Supports resume (skips already-synced sets)
- `searchLocalCards(name, number?, setId?)` — finds a single card by name in local cache
- `searchLocalCardsByQuery(query, limit?)` — returns array of matching cards (starts-with first, then contains). Used for cache-first search in scanner
- `getCacheStatus()` — returns `CacheMeta` with totalCards, cachedSets, totalSets, lastSync
- `clearCache()` — wipes all cached card data
- Cache keys: `pokescan_cache_meta`, `pokescan_cache_sets`, `pokescan_cache_cards_<setId>`
- `findCard()` in `lib/pokemon-api.ts` checks local cache first before hitting server API
- `searchCards()` in `lib/pokemon-api.ts` checks local cache first when any sets are cached — falls back to API if no local results
- **PokeBackground** (`components/PokeBackground.tsx`) — subtle Pokemon artwork watermark rendered on all main tab screens using official artwork sprites at low opacity

### Profile Picture
- Premium users can upload a profile picture via the Profile tab (tapping the avatar shows image picker)
- Stored as a local file URI in AsyncStorage via `updateUserAvatar()` in `lib/storage.ts`
- Exposed via `updateAvatar()` in user context

### API Routes (server/routes.ts)
- `GET /api/pokemon/sets` — Fetch all card sets
- `GET /api/pokemon/sets/:setId/cards` — Fetch cards in a set (paginated)
- `GET /api/pokemon/cards/search?q=` — Search cards by name
- `GET /api/pokemon/cards/find?name=&number=&setId=` — Find a card by name (and optional number/setId) — must be defined BEFORE `/:cardId` route
- `GET /api/pokemon/cards/:cardId` — Fetch individual card details
- `GET /api/pcv/sets` — Fetch all UK sets (scraped from pokecardvalues.co.uk server-side)
- `GET /api/pcv/sets/:setId/:slug/cards` — Fetch cards with UK GBP pricing
- `GET /api/pcv/top/:condition` — Top valued cards
- `GET /api/pcv/search?q=` — Search UK cards by name
- `GET /api/ebay/search-url` — Generate eBay UK search/sold URLs (client opens these links)
- `POST /api/identify-card` — AI card identification via OpenAI Vision

### External Navigation Policy
- **No external websites** are opened from within the app, except eBay UK links
- pokecardvalues.co.uk is scraped **server-side** only — users never navigate there
- When a PCV card is tapped (in set detail or scanner results), the app calls `/api/pokemon/cards/find` to look up the TCG card internally and navigate to `/card/[id]`
- If a card is not found in the TCG database, an in-app Alert shows the card info
- **Only allowed external links**: `ebay.co.uk` — "Active Listings" and "Sold Items" buttons on card detail page and scanner

### Data Storage
- **Client-side**: All user data (profiles, collections, listings) is stored in AsyncStorage on-device via `lib/storage.ts`. This includes user profiles, collection items with pricing, market listings, and admin credentials
- **Server-side schema**: A PostgreSQL schema exists in `shared/schema.ts` using Drizzle ORM with a basic `users` table (id, username, password). However, the current app primarily uses client-side storage — the Drizzle/Postgres setup is scaffolded but not fully integrated into the app's main features
- **Drizzle config**: Points to `DATABASE_URL` environment variable, outputs migrations to `./migrations/`
- **In-memory storage**: `server/storage.ts` has a `MemStorage` class implementing user CRUD as a Map — this is placeholder storage

### Authentication & Authorization
- **User registration (OTP-verified)**: Server-side registration with email/SMS OTP verification. Users register via `app/register.tsx` (3-step: form → channel selection → OTP entry). Data persisted in PostgreSQL `pokescan_users` table
- **Login (returning users)**: Re-login via `app/login.tsx` (2-step: credential → OTP). Users enter email or mobile number, receive OTP, and verify to get a session token
- **Session management**: Secure session tokens stored via `expo-secure-store` (native) with AsyncStorage fallback (web). Sessions persisted in PostgreSQL `pokescan_sessions` table. Auto-restored on app launch
- **OTP service** (`server/otp-service.ts`): In-memory OTP store with rate limiting (3 requests/minute per credential), attempt tracking (5 max attempts per code), 10-minute expiry, and auto-cleanup
- **Email delivery**: Via nodemailer (requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars). Falls back to console logging in dev mode
- **SMS delivery**: Via Twilio (requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` env vars). Not yet configured — falls back to console logging in dev mode. User declined Replit Twilio integration; manual credential setup needed later
- **Roles**: Three roles defined in `UserProfile.role` — `user`, `moderator`, `admin`
- **Superadmin**: Single owner account with hardcoded credentials (email: richiett17@hotmail.com). Login via "Superadmin Login" link on Profile tab. Creates a special `superadmin` user with admin role and OWNER badge. Uses local AsyncStorage (unchanged)
- **Role assignment**: Only the superadmin can assign roles to regular users from the admin panel Users tab. Three role options: Regular User, Market Moderator (can moderate listings), Full App Admin (full panel access). Staff (admin/moderator) automatically get premium access when assigned a role
- **Admin panel** (`app/admin-panel.tsx`): Two tabs — Listings (view/remove any marketplace listing, visible to all staff) and Users (manage roles and premium, visible to superadmin and admins only). Superadmin sees SUPERADMIN badge, others see their role badge
- **User registry**: All registered users tracked in `pokescan_all_users` AsyncStorage key for admin user management
- **Premium membership**: Can be granted/revoked by superadmin from admin panel. Staff roles automatically include premium
- **Staff access from marketplace**: When logged in as admin/moderator, the marketplace tab shows delete buttons on all listings (not just own)
- **Social auth**: Social login (Google/Apple) still uses client-side AsyncStorage via `registerSocialUser`. Not connected to PostgreSQL backend
- **Friends & Messaging**: Full social system via PostgreSQL. `pokescanFriendships` (requester/addressee/status) and `pokescanMessages` (sender/recipient/subject/body/isRead/deletedBySender/deletedByRecipient) tables. Social routes: `GET/POST /api/social/friends`, `/api/social/friend-request`, `/api/social/friend-respond`, `DELETE /api/social/friend-remove`, `GET /api/social/user-search`, `/api/social/messages/inbox`, `/api/social/messages/sent`, `/api/social/messages/unread-count`, `POST /api/social/messages/send`, `PATCH /api/social/messages/:id/read`, `DELETE /api/social/messages/:id`. All routes require Bearer session token. Client helpers in `lib/social-api.ts`. Messages screen at `app/messages.tsx` — Inbox/Sent/Friends tabs with compose modal, reply, delete, friend search/add/accept/decline. Mail icon with unread badge in Profile tab header. Market listings show "Message" button to sellers.

### Scrydex Scraper (`server/scrydex-scraper.ts`)
- Scrapes https://scrydex.com/pokemon/expansions (English + TCG Pocket sets)
- **NOT auto-triggered** — must be invoked via `POST /api/admin/scrydex-sync` (superadmin only)
- Deduplication rules: sets skipped if `pokemon_sets.id` already exists; cards skipped if `pokemon_cards.id` exists AND has images; images updated if card exists but `image_small` is NULL
- Card images served from `https://images.scrydex.com/pokemon/{setId}-{number}/medium` (and `/large`)
- Card IDs match TCG API format exactly (`sv10-3`, `me2pt5-45`, etc.)
- Preview endpoint: `GET /api/admin/scrydex-preview?superadminPassword=killer89!` — returns list of new sets without modifying DB
- Sync endpoint: `POST /api/admin/scrydex-sync` — streams progress via SSE, returns final stats
- As of implementation: 195 Scrydex sets vs 171 DB sets = **24 new sets** (Japanese Mega Evolution, TCG Pocket, McDonald's, Classic sets)

### Build & Deployment
- **Dev mode**: Two processes — Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production**: Static web build via custom `scripts/build.js`, Express serves static files
- **Server build**: esbuild bundles `server/index.ts` to `server_dist/`
- **Environment**: Uses Replit environment variables (`REPLIT_DEV_DOMAIN`, `EXPO_PUBLIC_DOMAIN`, `DATABASE_URL`)

### Currency
- All prices are displayed in GBP (British Pounds) using a `formatGBP` utility function, converting from USD TCGPlayer prices

## External Dependencies

### APIs
- **Pokémon TCG API** (`https://api.pokemontcg.io/v2`): Primary data source for all card and set information including images and pricing. The Express server proxies requests to this API

### Database
- **PostgreSQL**: Configured via Drizzle ORM with `DATABASE_URL` environment variable. Schema in `shared/schema.ts`
- **Card seeding**: `runFastCardSeed()` in `server/card-sync.ts` populates `pokemon_cards` table on startup if fewer than 80% of sets are seeded. Resumes mid-seed across restarts. All sets attempted (no prefix skip list — `me*`, `zsv*`, `rsv*` sets like Ascended Heroes and Phantasmal Flames DO have TCG API cards). Handles 429 rate-limits with backoff (30s/60s/90s wait), retries AbortErrors up to 3×, 30s per-page timeout. Optional `POKEMON_TCG_API_KEY` env var for higher rate limits
- **Admin - Delete User**: `DELETE /api/admin/delete-user` endpoint; `deleteUserFromRegistry()` in `lib/storage.ts`; `deleteUserAccount()` in user context; red trash button in admin panel Users tab (superadmin only, with confirmation alert)

### Key npm packages
- **expo** (~54.0.27): Core framework
- **express** (^5.0.1): Backend server
- **drizzle-orm** (^0.39.3) + **drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0): Data fetching and caching
- **pg** (^8.16.3): PostgreSQL client
- **expo-camera**: Card scanning capability
- **expo-image-picker**: Photo selection for card identification
- **patch-package**: Applied via postinstall for dependency patches