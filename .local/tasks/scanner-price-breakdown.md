# Detailed Price Breakdown in Card Scanner

## What & Why
The scanner currently shows a single "UK Value" price for a card. Collectors need richer price context: what cards have actually sold for at the low end, middle, and high end, and what graded copies (PSA/Beckett/ACE/CGC grades 9 and 10) are trading for. This makes the scanner genuinely useful for buying and selling decisions.

## Done looks like
- After a successful scan (database match or AI match with PCV results), the price section expands to show:
  - **Lowest sold** — the lowest recent eBay UK sold price for the raw card
  - **Median sold** — the median of recent eBay UK sold prices (already calculated server-side)
  - **Highest sold** — the highest recent eBay UK sold price for the raw card
- A separate collapsible "Graded Prices" section shows, for each grading company that has sold results (PSA, Beckett, ACE, CGC):
  - Grade 9 price (median from eBay UK sold results filtered to that grader + grade)
  - Grade 10 price (median from eBay UK sold results filtered to that grader + grade)
- If no sold data is available for a given grade/company, that row shows "No data" rather than a blank
- The server endpoint `GET /api/ebay/sold-price` is updated to return `lowestSold`, `medianSold`, `highestSold`, and a `gradedPrices` map (`{ PSA: { 9: number|null, 10: number|null }, Beckett: {...}, ACE: {...}, CGC: {...} }`)
- The card detail screen (`app/card/[id].tsx`) also shows the same expanded breakdown

## Out of scope
- Grades other than 9 and 10 (lowest-demand data)
- Non-UK markets
- Historical price charts

## Steps
1. **Enhanced eBay price endpoint** — Update the `GET /api/ebay/sold-price` server handler to extract min, median, and max from the raw sold listings array; additionally run four extra filtered queries (or filter the same result set) to find sold listings whose titles contain "PSA 9", "PSA 10", "BGS 9"/"Beckett 9", "BGS 10"/"Beckett 10", "ACE 9", "ACE 10", "CGC 9", "CGC 10"; compute a median for each and return them in the `gradedPrices` object.
2. **Scanner price UI** — Replace the current single-price display in `DatabaseMatchCard` and `AIPriceCard` with a three-row breakdown (Lowest / Median / Highest); add a collapsible "Graded Prices" section beneath it that renders a two-column grid (Grade 9 / Grade 10) for each grading company with results.
3. **Card detail price UI** — Apply the same expanded price layout to the price section on `app/card/[id].tsx`.

## Relevant files
- `server/routes.ts`
- `app/(tabs)/scanner.tsx`
- `app/card/[id].tsx`
