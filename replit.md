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
- `app/(tabs)/index.tsx` — Browse Pokemon card sets
- `app/(tabs)/scanner.tsx` — Search/scan cards (text search + image picker)
- `app/(tabs)/collection.tsx` — User's card collection with values
- `app/(tabs)/market.tsx` — Marketplace for trading/selling cards
- `app/(tabs)/profile.tsx` — User profile, stats, premium toggle
- `app/set/[id].tsx` — Set detail with card grid
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

### API Routes (server/routes.ts)
- `GET /api/pokemon/sets` — Fetch all card sets
- `GET /api/pokemon/sets/:setId/cards` — Fetch cards in a set (paginated)
- `GET /api/pokemon/cards/search?q=` — Search cards by name
- `GET /api/pokemon/cards/:cardId` — Fetch individual card details

### Data Storage
- **Client-side**: All user data (profiles, collections, listings) is stored in AsyncStorage on-device via `lib/storage.ts`. This includes user profiles, collection items with pricing, market listings, and admin credentials
- **Server-side schema**: A PostgreSQL schema exists in `shared/schema.ts` using Drizzle ORM with a basic `users` table (id, username, password). However, the current app primarily uses client-side storage — the Drizzle/Postgres setup is scaffolded but not fully integrated into the app's main features
- **Drizzle config**: Points to `DATABASE_URL` environment variable, outputs migrations to `./migrations/`
- **In-memory storage**: `server/storage.ts` has a `MemStorage` class implementing user CRUD as a Map — this is placeholder storage

### Authentication & Authorization
- **User registration**: Simple client-side registration stored in AsyncStorage (no server-side auth yet)
- **Roles**: Three roles defined — `user`, `moderator`, `admin`
- **Admin login**: Separate admin login flow with hardcoded or locally-stored credentials
- **Premium membership**: Toggle-based premium flag on user profile, can be granted/revoked by admins

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
- **PostgreSQL**: Configured via Drizzle ORM with `DATABASE_URL` environment variable. Schema in `shared/schema.ts`. Currently only has a users table; most data lives in client-side AsyncStorage

### Key npm packages
- **expo** (~54.0.27): Core framework
- **express** (^5.0.1): Backend server
- **drizzle-orm** (^0.39.3) + **drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0): Data fetching and caching
- **pg** (^8.16.3): PostgreSQL client
- **expo-camera**: Card scanning capability
- **expo-image-picker**: Photo selection for card identification
- **patch-package**: Applied via postinstall for dependency patches