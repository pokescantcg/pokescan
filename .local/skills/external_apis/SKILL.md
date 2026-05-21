---
name: external_apis
description: "Access external APIs through Replit-managed billing"
---

# External APIs

This skill provides access to external APIs through Replit-managed
passthrough billing. Requests are proxied through OpenInt with
managed credentials.

## Recommended workflow

1. Open the connector reference for request and response details.
2. Call `externalApi__<connector_name>` from `code_execution`.
3. Use `query` for URL parameters and parse `result.body`.
4. For media URLs, save files under `attached_assets/` and present them.

## Available APIs

- [Brave](references/brave.md) - Search real web image results through Brave passthrough billing.
<<<<<<< HEAD
- [ElevenLabs](references/elevenlabs.md)
- [Exa](references/exa.md)
- [Firecrawl](references/firecrawl.md)
- [Nano Banana](references/nano_banana.md)
=======
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
