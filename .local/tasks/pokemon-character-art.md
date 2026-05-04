# Add Pokémon Character Art to UI

## What & Why
Add Pokémon character illustrations (Pikachu and others) as decorative elements throughout the app using freely available official artwork from PokéAPI sprites. This gives the app a more playful, on-brand Pokémon feel beyond just the card images.

## Done looks like
- The Browse screen header features a Pikachu illustration as a decorative mascot alongside the title
- The Collection screen shows Pikachu (or a relevant Pokémon) in the empty state when no cards have been added
- The Scanner screen has a small Pokémon character decoration (e.g. Mewtwo or Rotom, fitting for a scanning tool) near the prompt text
- The Profile screen header includes a small Pokémon character decoration
- Pokémon artwork is loaded from PokéAPI's official artwork CDN (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/<id>.png`) — no assets need to be bundled
- Characters are tastefully sized and positioned so they enhance the UI without obscuring functionality

## Out of scope
- Animated Pokémon (static images only)
- Fetching Pokémon data from a live API at runtime for the decorations (use hardcoded IDs for specific Pokémon)
- Adding Pokémon to every single screen — focus on Browse, Collection empty state, Scanner, and Profile headers

## Tasks
1. **Browse screen header mascot** — Add a Pikachu illustration (Pokédex #25) in the header area of the Browse/home screen, positioned as a decorative element alongside the existing title and search bar. Keep it small enough not to crowd the UI.

2. **Collection empty state** — Replace or enhance the current empty-state view on the Collection screen with a Snorlax or Psyduck illustration and friendly copy like "Your collection is sleeping..." to make the empty state more engaging.

3. **Scanner screen decoration** — Add a small Rotom-Dex style Pokémon (Rotom, #479) near the scanner prompt area to reinforce the "scan your card" theme.

4. **Profile screen header** — Add a small Eevee or Poké Ball-themed Pokémon decoration to the Profile screen header for visual consistency with the other screens.

## Relevant files
- `app/(tabs)/index.tsx`
- `app/(tabs)/collection.tsx`
- `app/(tabs)/scanner.tsx`
- `app/(tabs)/profile.tsx`
- `constants/colors.ts`
