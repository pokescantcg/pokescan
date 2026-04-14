import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FREE_SCANS_PER_DAY = 25;
const BONUS_EXPIRY_DAYS = 7;

export interface BonusPool {
  amount: number;
  expiresAt: string; // YYYY-MM-DD
}

export interface ScanQuota {
  freeScansRemaining: number;
  bonusScansAvailable: number;
  totalRemaining: number;
  consecutiveLoginDays: number;
  lastLoginDate: string | null;
  bonusPools: BonusPool[];
  alreadyCheckedInToday: boolean;
  bonusEarnedToday: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parsePools(raw: string | null): BonusPool[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function filterExpiredPools(pools: BonusPool[], today: string): BonusPool[] {
  return pools.filter(p => p.expiresAt >= today);
}

function sumPools(pools: BonusPool[]): number {
  return pools.reduce((s, p) => s + p.amount, 0);
}

export async function getUserQuota(userId: string): Promise<ScanQuota> {
  const today = todayStr();
  const row = await pool.query(
    `SELECT scans_used_today, scan_date, consecutive_login_days, last_login_date, bonus_scan_pools
     FROM pokescan_users WHERE id = $1`,
    [userId]
  );
  if (!row.rows[0]) throw new Error("User not found");
  const r = row.rows[0];
  const scansUsedToday = r.scan_date === today ? (r.scans_used_today ?? 0) : 0;
  const allPools = parsePools(r.bonus_scan_pools);
  const activePools = filterExpiredPools(allPools, today);
  const bonusAvailable = sumPools(activePools);
  const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);

  return {
    freeScansRemaining: freeRemaining,
    bonusScansAvailable: bonusAvailable,
    totalRemaining: freeRemaining + bonusAvailable,
    consecutiveLoginDays: r.consecutive_login_days ?? 0,
    lastLoginDate: r.last_login_date ?? null,
    bonusPools: activePools,
    alreadyCheckedInToday: r.last_login_date === today,
    bonusEarnedToday: 0,
  };
}

export async function dailyCheckin(userId: string): Promise<ScanQuota & { bonusEarnedToday: number; streakReset: boolean }> {
  const today = todayStr();
  const yesterday = yesterdayStr();

  const row = await pool.query(
    `SELECT scans_used_today, scan_date, consecutive_login_days, last_login_date, bonus_scan_pools
     FROM pokescan_users WHERE id = $1`,
    [userId]
  );
  if (!row.rows[0]) throw new Error("User not found");
  const r = row.rows[0];

  const lastLogin: string | null = r.last_login_date ?? null;

  // Already checked in today — return current state
  if (lastLogin === today) {
    const scansUsedToday = r.scan_date === today ? (r.scans_used_today ?? 0) : 0;
    const activePools = filterExpiredPools(parsePools(r.bonus_scan_pools), today);
    const bonusAvailable = sumPools(activePools);
    const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
    return {
      freeScansRemaining: freeRemaining,
      bonusScansAvailable: bonusAvailable,
      totalRemaining: freeRemaining + bonusAvailable,
      consecutiveLoginDays: r.consecutive_login_days ?? 0,
      lastLoginDate: today,
      bonusPools: activePools,
      alreadyCheckedInToday: true,
      bonusEarnedToday: 0,
      streakReset: false,
    };
  }

  // Determine new streak
  let currentStreak: number = r.consecutive_login_days ?? 0;
  let existingPools = parsePools(r.bonus_scan_pools);
  let streakReset = false;

  if (lastLogin === yesterday) {
    // Consecutive day — extend streak
    currentStreak = currentStreak + 1;
  } else {
    // Missed a day — reset streak, lose all bonus pools
    currentStreak = 1;
    existingPools = [];
    streakReset = lastLogin !== null; // only flag reset if they had a streak
  }

  // Cap at 7 then reset
  let bonusEarned = 0;
  let newStreak = currentStreak;
  if (currentStreak === 7) {
    bonusEarned = 10;
    newStreak = 0; // reset after day 7 collected
  } else {
    bonusEarned = 5;
  }

  // Add new bonus pool — expires BONUS_EXPIRY_DAYS from today
  const newPool: BonusPool = { amount: bonusEarned, expiresAt: addDays(today, BONUS_EXPIRY_DAYS) };
  const updatedPools = filterExpiredPools([...existingPools, newPool], today);

  await pool.query(
    `UPDATE pokescan_users
     SET consecutive_login_days = $1,
         last_login_date = $2,
         bonus_scan_pools = $3
     WHERE id = $4`,
    [newStreak, today, JSON.stringify(updatedPools), userId]
  );

  const scansUsedToday = r.scan_date === today ? (r.scans_used_today ?? 0) : 0;
  const bonusAvailable = sumPools(updatedPools);
  const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);

  return {
    freeScansRemaining: freeRemaining,
    bonusScansAvailable: bonusAvailable,
    totalRemaining: freeRemaining + bonusAvailable,
    consecutiveLoginDays: newStreak,
    lastLoginDate: today,
    bonusPools: updatedPools,
    alreadyCheckedInToday: false,
    bonusEarnedToday: bonusEarned,
    streakReset,
  };
}

export async function consumeScan(userId: string): Promise<{ allowed: boolean; freeRemaining: number; bonusRemaining: number }> {
  const today = todayStr();
  const row = await pool.query(
    `SELECT scans_used_today, scan_date, bonus_scan_pools FROM pokescan_users WHERE id = $1`,
    [userId]
  );
  if (!row.rows[0]) return { allowed: false, freeRemaining: 0, bonusRemaining: 0 };
  const r = row.rows[0];

  const scansUsedToday = r.scan_date === today ? (r.scans_used_today ?? 0) : 0;
  const activePools = filterExpiredPools(parsePools(r.bonus_scan_pools), today);
  const bonusAvailable = sumPools(activePools);
  const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);

  if (freeRemaining + bonusAvailable <= 0) {
    return { allowed: false, freeRemaining: 0, bonusRemaining: 0 };
  }

  let newScansUsed = scansUsedToday;
  let newPools = activePools;

  if (freeRemaining > 0) {
    // Use a free scan first
    newScansUsed = scansUsedToday + 1;
  } else {
    // Use a bonus scan — drain oldest pool first
    let remaining = 1;
    newPools = activePools.map(p => {
      if (remaining <= 0) return p;
      const use = Math.min(remaining, p.amount);
      remaining -= use;
      return { ...p, amount: p.amount - use };
    }).filter(p => p.amount > 0);
  }

  await pool.query(
    `UPDATE pokescan_users SET scans_used_today = $1, scan_date = $2, bonus_scan_pools = $3 WHERE id = $4`,
    [newScansUsed, today, JSON.stringify(newPools), userId]
  );

  const newFreeRemaining = Math.max(0, FREE_SCANS_PER_DAY - newScansUsed);
  const newBonusRemaining = sumPools(newPools);

  return { allowed: true, freeRemaining: newFreeRemaining, bonusRemaining: newBonusRemaining };
}
