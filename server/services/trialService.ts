// ============================================================
// trialService.ts  —  drop into your server/services/ folder
// ============================================================
// Handles: trial eligibility check, trial grant, trial status,
//          soft-delete (keeps collection data), premium expiry.
// Stack: Drizzle ORM + PostgreSQL (matches your existing schema)
// ============================================================

import { db } from "../db"; // adjust path
import { pokescanUsers, pokescanRegisteredIdentifiers } from "../schema"; // adjust path
import { eq, or } from "drizzle-orm";

const TRIAL_DAYS = 3;

// ─── Types ──────────────────────────────────────────────────

export type TrialStatus =
  | { status: "active"; daysLeft: number; hoursLeft: number }
  | { status: "expired" }
  | { status: "paid" }
  | { status: "ineligible" } // already used trial (this or a prev account)
  | { status: "none" }; // free user, never started a trial

// ─── On Registration ─────────────────────────────────────────

/**
 * Call this immediately after creating the pokescan_users row.
 * 1. Upserts email + mobile into pokescan_registered_identifiers.
 * 2. Grants a 3-day trial only if NEITHER value was seen before.
 * Returns whether the trial was granted.
 */
export async function handleNewUserRegistration(
  userId: string,
  email: string,
  mobileNumber: string,
): Promise<{ trialGranted: boolean }> {
  // 1. Check if either identifier has been seen before
  const existing = await db
    .select({ id: pokescanRegisteredIdentifiers.id })
    .from(pokescanRegisteredIdentifiers)
    .where(
      or(
        email
          ? eq(pokescanRegisteredIdentifiers.email, email.toLowerCase())
          : undefined,
        mobileNumber
          ? eq(pokescanRegisteredIdentifiers.mobileNumber, mobileNumber)
          : undefined,
      ),
    )
    .limit(1);

  const isEligible = existing.length === 0;

  // 2. Record the email identifier (ignore conflict — first write wins)
  if (email) {
    await db
      .insert(pokescanRegisteredIdentifiers)
      .values({ email: email.toLowerCase(), trialGranted: isEligible })
      .onConflictDoNothing();
  }

  // 3. Record the mobile identifier separately (different unique index)
  if (mobileNumber) {
    await db
      .insert(pokescanRegisteredIdentifiers)
      .values({ mobileNumber, trialGranted: isEligible })
      .onConflictDoNothing();
  }

  // 4. If eligible, stamp trial dates and flip isPremium on the user row
  if (isEligible) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    await db
      .update(pokescanUsers)
      .set({
        trialStartedAt: now,
        trialEndsAt: trialEnd,
        isPremium: true,
        isTrialUsed: true,
      })
      .where(eq(pokescanUsers.id, userId));
  } else {
    // Mark trial as used (ineligible) so we don't re-check each time
    await db
      .update(pokescanUsers)
      .set({ isTrialUsed: true })
      .where(eq(pokescanUsers.id, userId));
  }

  return { trialGranted: isEligible };
}

// ─── Trial Status Helper ─────────────────────────────────────

/**
 * Returns the current premium/trial status for a user.
 * Call this whenever you need to know what to show in the UI.
 */
export function getTrialStatus(user: {
  isPremium: boolean;
  isTrialUsed: boolean;
  trialEndsAt: Date | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
}): TrialStatus {
  // Paid Stripe subscriber
  if (user.stripeSubscriptionId && user.subscriptionStatus === "active") {
    return { status: "paid" };
  }

  // Never started a trial and no Stripe
  if (!user.isTrialUsed && !user.trialEndsAt) {
    return { status: "none" };
  }

  // Was marked ineligible at registration (prev account detected)
  if (user.isTrialUsed && !user.trialEndsAt) {
    return { status: "ineligible" };
  }

  // Has trial dates — check if still active
  if (user.trialEndsAt) {
    const msLeft = user.trialEndsAt.getTime() - Date.now();
    if (msLeft > 0) {
      return {
        status: "active",
        daysLeft: Math.ceil(msLeft / (1000 * 60 * 60 * 24)),
        hoursLeft: Math.ceil(msLeft / (1000 * 60 * 60)),
      };
    }
    // Trial window has passed
    return { status: "expired" };
  }

  return { status: "none" };
}

// ─── Expire Trials (run as a cron job, e.g. every hour) ──────

/**
 * Finds users whose trial has ended and flips isPremium to false.
 * Collection data is NOT touched — rows stay, premium features gated.
 * Recommended: run every 30–60 minutes via node-cron or a Replit scheduled job.
 */
export async function expireTrials(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(pokescanUsers)
    .set({ isPremium: false })
    .where(
      // trialEndsAt is in the past AND user is still marked premium
      // AND they don't have an active Stripe sub
      sql`
        trial_ends_at IS NOT NULL
        AND trial_ends_at < ${now}
        AND is_premium = TRUE
        AND (stripe_subscription_id IS NULL OR subscription_status != 'active')
      `,
    );

  // result.rowCount varies by Drizzle version — return 0 as fallback
  return (result as any).rowCount ?? 0;
}

// ─── Soft-Delete User (keeps collection data) ────────────────

/**
 * "Deletes" an account without removing collections, scan history, etc.
 * - Nulls out PII on the user row
 * - pokescan_registered_identifiers rows are NEVER touched
 * - pokescan_collections, pokescan_scan_history etc. stay intact
 *   (userId FK still resolves if the user re-registers)
 */
export async function softDeleteUser(userId: string): Promise<void> {
  await db
    .update(pokescanUsers)
    .set({
      deletedAt: new Date(),
      email: `deleted_${userId}@deleted.invalid`, // anonymise
      mobileNumber: "",
      passwordHash: null,
      avatarUrl: null,
      // isPremium left as-is (expireTrials() will clean it up)
      // isTrialUsed left as true — important for fraud check
    })
    .where(eq(pokescanUsers.id, userId));

  // ⚠️  Do NOT delete from pokescan_registered_identifiers
  // ⚠️  Do NOT cascade-delete pokescan_collections or pokescan_scan_history
}
