# PokeScan TCG

## Overview
PokeScan TCG is a Pokémon Trading Card Game companion app for tracking collections, market trading, and card scanning. It provides users with tools to browse card sets, identify cards, and manage their personal collections, including pricing in GBP. The platform also features a marketplace for users to trade and sell cards, supported by a robust user authentication system, premium memberships, and an administrative panel for moderation. The project aims to offer a comprehensive and user-friendly experience for TCG enthusiasts, with plans for social features like messaging and friend management to foster a community around card collecting.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is developed using Expo (SDK 54) and React Native (0.81) with the new architecture. It utilizes `expo-router` for file-based navigation, organizing screens into tabs (Browse, Scan, Collection, Market, Profile) and detailed views for sets and individual cards. State management is handled with React Context for global user states and TanStack React Query for server data. Local data persistence relies on AsyncStorage. The UI adheres to a dark Pokémon-themed palette, supports dark/light modes, and uses the Outfit font family. Key features include AI-powered card identification and grading (premium), and a dynamic display of card sets, including multi-language support (English, Japanese, Korean, Chinese).

### Backend
The backend is an Express.js server developed with Node.js and TypeScript. It primarily functions as a proxy to the Pokémon TCG API and serves static web assets in production. The server handles API requests for fetching card sets, individual cards, and supporting features like UK pricing data scraped from external sources (pokecardvalues.co.uk). It is designed to handle user authentication, session management, OTP verification for registration, and administrative functions. The backend also includes a card caching mechanism to minimize external API calls and improve performance.

### Data Storage
All persistent user data is stored server-side in PostgreSQL via Drizzle ORM: users, sessions, collections (`pokescan_collections` table), marketplace listings (`pokescan_market_listings`), social features (friendships, messages), and avatars (base64 in `avatar_url` column). Collections support card variants (Non-Holo/Holo/Reverse Holo) and are scoped per user with full CRUD via `/api/collection` endpoints. A local-to-server migration function (`migrateLocalCollectionToServer`) syncs any legacy AsyncStorage collection data to the server on login/session restore, with idempotent upsert logic to prevent quantity inflation on retries. AsyncStorage is used only as a fallback cache when offline. A robust card seeding mechanism populates the `pokemon_cards` table from the Pokémon TCG API and Scrydex, including comprehensive Japanese, Korean, and Chinese set data, with mechanisms for rate-limit handling and data deduplication.

### Authentication & Authorization
The system supports user registration and login with OTP verification (email/SMS). Session tokens are securely managed using `expo-secure-store` and stored in PostgreSQL. Users are assigned roles (`user`, `moderator`, `admin`), with a hardcoded superadmin account capable of managing user roles and premium memberships. An admin panel allows staff to moderate listings and manage users. A comprehensive social system is implemented with PostgreSQL for managing friendships and real-time messaging between users.

### Core Features
- **Card Browsing & Search**: Users can browse Pokémon card sets by language and search for specific cards.
- **Card Scanning & Identification**: AI-powered identification for cards, including a premium grading tool. Free users get 25 scans/day plus bonus scans from the daily login streak system.
- **Scan Quota & Daily Login Streak**: Free users get 25 scans/day. Each consecutive day earns +5 bonus scans (valid 7 days). Day 7 earns +10 and resets the streak. Missing a day loses all accumulated bonus scans. Premium users have unlimited scans.
- **Collection Management**: Users can track their card collections with up-to-date GBP pricing.
- **Marketplace**: A platform for users to list, trade, and sell cards.
- **User Profiles**: Personalized profiles with premium features like profile picture uploads.
- **Admin Panel**: Tools for moderation of listings and user management, including role assignment and premium status. Superadmins have a Database tab with Scrydex sync, Asian set sync (JP/KO/ZH with auto card seeding), and set visibility management (hide/release sets).
- **Social System**: Friend management, private messaging, user search, and a Premium Chat Room (group chat for premium users, messages auto-deleted after 7 days). Admins can add friends directly from the admin panel Users tab.
- **Stripe Subscriptions**: Premium membership at £4.99/month or £49.99/year via Stripe Checkout. Webhook-based status sync. Price IDs: monthly=`price_1TM7D8K7N6BNdayAPnuINUuU`, annual=`price_1TM7D8K7N6BNdayAB1PFakyH`.
- **External Data Integration**: Seamless integration of data from the Pokémon TCG API and scraped UK pricing data.

## External Dependencies

### APIs
- **Pokémon TCG API**: Primary source for card and set data.
- **OpenAI Vision**: Used for AI card identification (`/api/identify-card`).
- **Nodemailer**: For email delivery of OTPs.
- **Twilio**: (Planned) For SMS delivery of OTPs.

### Database
- **PostgreSQL**: Used with Drizzle ORM for server-side data persistence (users, sessions, social features, card seed data).

### Key npm packages
- `expo`: Core framework for React Native application development.
- `express`: Backend server framework.
- `drizzle-orm` & `drizzle-kit`: ORM for PostgreSQL.
- `@tanstack/react-query`: Data fetching and caching for the frontend.
- `pg`: PostgreSQL client.
- `expo-camera`, `expo-image-picker`: For card scanning and image selection.