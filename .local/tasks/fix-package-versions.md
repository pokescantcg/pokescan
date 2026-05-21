# Fix Expo Package Version Mismatches

## What & Why
The most recent publish build failed because several packages are out of sync with the installed Expo SDK version. The Metro bundler starts but silently fails during the production bundle step. The most critical mismatch is `react-native-keyboard-controller` at v1.20.6 when Expo expects 1.18.5 (project guidelines require it pinned to exactly 1.18.0). Several other packages are also slightly behind their expected versions.

Packages flagged by Metro during the failed build:
- `expo` — installed 54.0.32, expected ~54.0.34
- `expo-auth-session` — installed 7.0.10, expected ~7.0.11
- `expo-crypto` — installed 15.0.8, expected ~15.0.9
- `expo-glass-effect` — installed 0.1.8, expected ~0.1.10
- `expo-image-picker` — installed 17.0.10, expected ~17.0.11
- `expo-linking` — installed 8.0.11, expected ~8.0.12
- `expo-router` — installed 6.0.22, expected ~6.0.23
- `expo-web-browser` — installed 15.0.10, expected ~15.0.11
- `react-native-keyboard-controller` — installed 1.20.6, expected 1.18.5 (pin to 1.18.0 per project rules)

## Done looks like
- All flagged packages are updated to their Expo-compatible versions
- `react-native-keyboard-controller` is pinned to exactly 1.18.0
- The app builds and runs without Metro version warnings
- A publish attempt succeeds

## Out of scope
- Upgrading to a newer Expo SDK version
- Any feature or UI changes

## Steps
1. **Update packages** — Use the package management tooling to update all flagged packages to their expected versions. Pin `react-native-keyboard-controller` to exactly 1.18.0.
2. **Verify the app starts** — Restart the frontend workflow and confirm the app loads without errors in development.
3. **Prompt to re-publish** — Once the app is confirmed working, prompt the user to click Publish so the fixed build can be verified.

## Relevant files
- `package.json`
- `app.json`
