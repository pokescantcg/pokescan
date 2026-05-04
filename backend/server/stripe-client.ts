/**
 * Stripe integration — Replit connector pattern
 * Never cache the client; tokens expire.
 */
import Stripe from "stripe";

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    // Fallback for local dev without connector
    const sk = process.env.STRIPE_SECRET_KEY;
    const pk = process.env.STRIPE_PUBLISHABLE_KEY;
    if (sk && pk) return { secretKey: sk, publishableKey: pk };
    throw new Error("Stripe credentials not found. Set up the Stripe connector or STRIPE_SECRET_KEY env var.");
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const environments = isProduction ? ["production", "development"] : ["development", "production"];

  for (const env of environments) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", env);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    });
    const data = await response.json();
    const conn = data.items?.[0];

    if (conn?.settings?.secret && conn?.settings?.publishable) {
      return { secretKey: conn.settings.secret, publishableKey: conn.settings.publishable };
    }
  }

  throw new Error("Stripe connection not found. Set up the Stripe connector in Replit integrations.");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

/**
 * Ensure the user has a valid Stripe customer in the CURRENT mode (test/live).
 * Auto-recreates and persists a fresh customer if the stored ID is missing,
 * invalid, or belongs to the other Stripe mode (e.g. after switching keys).
 */
export async function ensureStripeCustomer(
  stripe: Stripe,
  user: any,
): Promise<string> {
  const { storage } = await import("./storage");
  const stored = (user as any).stripeCustomerId as string | undefined;

  if (stored) {
    try {
      const existing = await stripe.customers.retrieve(stored);
      if (existing && !(existing as any).deleted) {
        return stored;
      }
    } catch (err: any) {
      // Falls through to recreate. Common causes:
      //   - "No such customer" (test ID used with live key, or vice-versa)
      //   - Customer was deleted in the Stripe dashboard
      console.warn(
        `[Stripe] Stored customer ${stored} invalid for current mode (${err.message}). Recreating...`,
      );
    }
  }

  const fresh = await stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: { pokescanUserId: user.id },
  });
  await storage.updateUser(user.id, { stripeCustomerId: fresh.id } as any);
  return fresh.id;
}
