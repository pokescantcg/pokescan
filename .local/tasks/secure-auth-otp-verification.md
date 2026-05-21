# Secure Auth with Email/Mobile OTP

## What & Why
The current sign-up only asks for a username and display name, stores user data in plain AsyncStorage, and has no account verification. This task upgrades the auth flow to:
- Require **both email and mobile number** at sign-up
- Send a **one-time confirmation code (OTP)** to the user's chosen channel (email or SMS) to verify and complete account setup
- Store the current session securely using `expo-secure-store` so users are automatically re-logged in after closing the app or logging out and back in

## Done looks like
- The manual sign-up form collects username, display name, email address, and mobile number (all required)
- After submitting the form, the user is shown an OTP entry screen and can choose to receive the code via email or SMS
- Entering the correct code confirms the account and logs the user in
- After logout, the user can return to the app and log back in using their email or mobile number + OTP (no password needed)
- On every app launch, a stored session token in secure storage is checked — if valid, the user is silently re-authenticated without having to sign in again
- Sensitive auth data (session token, user credentials) is stored in `expo-secure-store` rather than plain `AsyncStorage`

## Out of scope
- Changing social (Google, Facebook, etc.) sign-in flows — only the manual/local sign-up is affected
- Password-based login — OTP is the sole verification mechanism
- The super-admin login screen (admin-login.tsx) is not changed

## Tasks
1. **Backend: OTP generation and verification endpoints** — Add server routes to generate a 6-digit OTP for a given email or phone number, store it temporarily (in-memory with a 10-minute TTL), and expose a verification endpoint that checks the submitted code. Add a route for "re-login by credential" that issues a new session token after OTP verification. Use `nodemailer` (with a configurable SMTP transport) for email delivery and the `twilio` package for SMS delivery. Store required API keys as environment secrets (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).

2. **Backend: User persistence and session tokens** — Extend `shared/schema.ts` and `server/storage.ts` to persist users to the PostgreSQL database with `email`, `mobileNumber`, `username`, and `displayName` fields. Generate a secure random session token on successful OTP verification and store it against the user record. Add a session-lookup endpoint the app uses on launch to restore a session from a stored token.

3. **Frontend: Updated sign-up form** — Update `app/register.tsx` to add `email` and `mobileNumber` fields (both required) to the manual sign-up form. After the user submits, present a channel-selection step ("Send code to Email" or "Send code to Mobile") and then an OTP entry screen. On successful OTP entry, call the backend verification endpoint, receive the session token, and store it in `expo-secure-store`.

4. **Frontend: Secure session storage and re-login** — Update `lib/storage.ts` and `lib/user-context.tsx` to replace plain `AsyncStorage` session storage with `expo-secure-store` for the session token. On app launch, read the stored token and call the session-restore endpoint to silently re-authenticate the user. After logout, clear the secure token so re-login requires OTP again. Keep non-sensitive data (collection, listings) in `AsyncStorage` as-is.

5. **Frontend: Re-login screen** — Add a lightweight login screen (reachable from the profile tab when logged out) where returning users enter their email or mobile number, receive an OTP, and are logged back in. This replaces the current "no login" state where users just create a new account.

## Relevant files
- `app/register.tsx`
- `app/admin-login.tsx`
- `app/(tabs)/profile.tsx`
- `lib/storage.ts`
- `lib/user-context.tsx`
- `server/storage.ts`
- `server/routes.ts`
- `server/index.ts`
- `shared/schema.ts`
