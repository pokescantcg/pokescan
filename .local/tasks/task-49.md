---
title: Improve card scanner accuracy
---
# Improve Card Scanner Accuracy

## What & Why
The card scanner has several compounding issues that reduce identification accuracy. The AI is given low-resolution image thumbnails (512×512), an overly compressed camera image, a generic prompt that misses key visual identifiers, and no retry guidance for the user when confidence is low. Fixing these will significantly improve correct identification rates across all languages and card types.

## Done looks like
- Cards are consistently identified correctly, including their collector number and set, not just the Pokémon name
- Japanese, Korean, and Chinese cards identify accurately
- When confidence is medium or low, the user sees clear retake guidance with specific tips (lighting, framing, distance)
- A card-shaped alignment overlay helps users frame the card before shooting
- Response time stays reasonable despite the higher image quality

## Out of scope
- Changing the AI model itself (gpt-5.2 is already high-capability)
- Adding a second-image scan flow for identification (that's already in the grading tool)
- Offline / on-device identification

## Steps

1. **Switch image detail from "low" to "high" in the identify-card endpoint** — Change `detail: "low"` to `detail: "high"` on the image sent to OpenAI. This is the single biggest accuracy improvement: "high" processes the image at full resolution in 512×512 tiles rather than collapsing it to one thumbnail. Increase the `max_completion_tokens` to 600 and the request body limit to `"15mb"` to accommodate the larger context.

2. **Increase camera and picker image quality** — Raise the camera capture `quality` from `0.5` to `0.85` and the gallery picker from `0.7` to `0.85` in the scanner's `handleCameraCapture` and gallery handler. This gives the AI sharper source material to work from.

3. **Improve the identification prompt** — Rewrite the system prompt to give the AI more targeted visual instructions: specifically look at the collector number at the very bottom of the card (e.g. "025/198" or "SV049"), find the expansion symbol in the bottom-right corner of the artwork box to determine the set, note the copyright year line for era context, and check the HP/type for Pokémon validation. Keep the same JSON response format. Also instruct the AI to prefer "medium" over "high" confidence when the card number is ambiguous, rather than guessing.

4. **Add low-confidence retake guidance** — When the API returns `confidence: "low"` or `"medium"`, display a retake banner above the result with 3 specific tips: (1) ensure the card fills at least 80% of the frame, (2) use good even lighting with no glare or shadow, (3) hold the phone steady and parallel to the card. Include a prominent "Retake Photo" button that clears the result and reopens the camera directly. Only show the result card below the banner, not instead of it.

5. **Add a card alignment overlay to the camera capture** — Before the user presses the camera shutter button in the scanner, show a rounded-rectangle outline overlay (portrait, ~70% of screen width, card aspect ratio 3:4) with corner markers to indicate where to position the card. Add a short label "Align card within the frame". This is purely a UI guide drawn over the camera preview — no OCR or real-time analysis needed.

## Relevant files
- `server/routes.ts:1092-1210`
- `app/(tabs)/scanner.tsx:1560-1620`
- `app/(tabs)/scanner.tsx:900-935`