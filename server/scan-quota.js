"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserQuota = getUserQuota;
exports.dailyCheckin = dailyCheckin;
exports.consumeScan = consumeScan;
var pg_1 = require("pg");
var pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
var FREE_SCANS_PER_DAY = 25;
var BONUS_EXPIRY_DAYS = 7;
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
    var d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
function parsePools(raw) {
    if (!raw)
        return [];
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return [];
    }
}
function filterExpiredPools(pools, today) {
    return pools.filter(function (p) { return p.expiresAt >= today; });
}
function sumPools(pools) {
    return pools.reduce(function (s, p) { return s + p.amount; }, 0);
}
function getUserQuota(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var today, row, r, scansUsedToday, allPools, activePools, bonusAvailable, freeRemaining;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    today = todayStr();
                    return [4 /*yield*/, pool.query("SELECT scans_used_today, scan_date, consecutive_login_days, last_login_date, bonus_scan_pools\n     FROM pokescan_users WHERE id = $1", [userId])];
                case 1:
                    row = _d.sent();
                    if (!row.rows[0])
                        throw new Error("User not found");
                    r = row.rows[0];
                    scansUsedToday = r.scan_date === today ? ((_a = r.scans_used_today) !== null && _a !== void 0 ? _a : 0) : 0;
                    allPools = parsePools(r.bonus_scan_pools);
                    activePools = filterExpiredPools(allPools, today);
                    bonusAvailable = sumPools(activePools);
                    freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
                    return [2 /*return*/, {
                            freeScansRemaining: freeRemaining,
                            bonusScansAvailable: bonusAvailable,
                            totalRemaining: freeRemaining + bonusAvailable,
                            consecutiveLoginDays: (_b = r.consecutive_login_days) !== null && _b !== void 0 ? _b : 0,
                            lastLoginDate: (_c = r.last_login_date) !== null && _c !== void 0 ? _c : null,
                            bonusPools: activePools,
                            alreadyCheckedInToday: r.last_login_date === today,
                            bonusEarnedToday: 0,
                        }];
            }
        });
    });
}
function dailyCheckin(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var today, yesterday, row, r, lastLogin, scansUsedToday_1, activePools, bonusAvailable_1, freeRemaining_1, currentStreak, existingPools, streakReset, bonusEarned, newStreak, newPool, updatedPools, scansUsedToday, bonusAvailable, freeRemaining;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    today = todayStr();
                    yesterday = yesterdayStr();
                    return [4 /*yield*/, pool.query("SELECT scans_used_today, scan_date, consecutive_login_days, last_login_date, bonus_scan_pools\n     FROM pokescan_users WHERE id = $1", [userId])];
                case 1:
                    row = _f.sent();
                    if (!row.rows[0])
                        throw new Error("User not found");
                    r = row.rows[0];
                    lastLogin = (_a = r.last_login_date) !== null && _a !== void 0 ? _a : null;
                    // Already checked in today — return current state
                    if (lastLogin === today) {
                        scansUsedToday_1 = r.scan_date === today ? ((_b = r.scans_used_today) !== null && _b !== void 0 ? _b : 0) : 0;
                        activePools = filterExpiredPools(parsePools(r.bonus_scan_pools), today);
                        bonusAvailable_1 = sumPools(activePools);
                        freeRemaining_1 = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday_1);
                        return [2 /*return*/, {
                                freeScansRemaining: freeRemaining_1,
                                bonusScansAvailable: bonusAvailable_1,
                                totalRemaining: freeRemaining_1 + bonusAvailable_1,
                                consecutiveLoginDays: (_c = r.consecutive_login_days) !== null && _c !== void 0 ? _c : 0,
                                lastLoginDate: today,
                                bonusPools: activePools,
                                alreadyCheckedInToday: true,
                                bonusEarnedToday: 0,
                                streakReset: false,
                            }];
                    }
                    currentStreak = (_d = r.consecutive_login_days) !== null && _d !== void 0 ? _d : 0;
                    existingPools = parsePools(r.bonus_scan_pools);
                    streakReset = false;
                    if (lastLogin === yesterday) {
                        // Consecutive day — extend streak
                        currentStreak = currentStreak + 1;
                    }
                    else {
                        // Missed a day — reset streak only, bonus pools are kept until they naturally expire
                        currentStreak = 1;
                        streakReset = lastLogin !== null; // only flag reset if they had a streak
                    }
                    bonusEarned = 0;
                    newStreak = currentStreak;
                    if (currentStreak === 7) {
                        bonusEarned = 10;
                        newStreak = 0; // reset after day 7 collected
                    }
                    else {
                        bonusEarned = 5;
                    }
                    newPool = { amount: bonusEarned, expiresAt: addDays(today, BONUS_EXPIRY_DAYS) };
                    updatedPools = filterExpiredPools(__spreadArray(__spreadArray([], existingPools, true), [newPool], false), today);
                    return [4 /*yield*/, pool.query("UPDATE pokescan_users\n     SET consecutive_login_days = $1,\n         last_login_date = $2,\n         bonus_scan_pools = $3\n     WHERE id = $4", [newStreak, today, JSON.stringify(updatedPools), userId])];
                case 2:
                    _f.sent();
                    scansUsedToday = r.scan_date === today ? ((_e = r.scans_used_today) !== null && _e !== void 0 ? _e : 0) : 0;
                    bonusAvailable = sumPools(updatedPools);
                    freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
                    return [2 /*return*/, {
                            freeScansRemaining: freeRemaining,
                            bonusScansAvailable: bonusAvailable,
                            totalRemaining: freeRemaining + bonusAvailable,
                            consecutiveLoginDays: newStreak,
                            lastLoginDate: today,
                            bonusPools: updatedPools,
                            alreadyCheckedInToday: false,
                            bonusEarnedToday: bonusEarned,
                            streakReset: streakReset,
                        }];
            }
        });
    });
}
function consumeScan(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var today, row, r, scansUsedToday, activePools, bonusAvailable, freeRemaining, newScansUsed, newPools, remaining_1, newFreeRemaining, newBonusRemaining;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    today = todayStr();
                    return [4 /*yield*/, pool.query("SELECT scans_used_today, scan_date, bonus_scan_pools FROM pokescan_users WHERE id = $1", [userId])];
                case 1:
                    row = _b.sent();
                    if (!row.rows[0])
                        return [2 /*return*/, { allowed: false, freeRemaining: 0, bonusRemaining: 0 }];
                    r = row.rows[0];
                    scansUsedToday = r.scan_date === today ? ((_a = r.scans_used_today) !== null && _a !== void 0 ? _a : 0) : 0;
                    activePools = filterExpiredPools(parsePools(r.bonus_scan_pools), today);
                    bonusAvailable = sumPools(activePools);
                    freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
                    if (freeRemaining + bonusAvailable <= 0) {
                        return [2 /*return*/, { allowed: false, freeRemaining: 0, bonusRemaining: 0 }];
                    }
                    newScansUsed = scansUsedToday;
                    newPools = activePools;
                    if (freeRemaining > 0) {
                        // Use a free scan first
                        newScansUsed = scansUsedToday + 1;
                    }
                    else {
                        remaining_1 = 1;
                        newPools = activePools.map(function (p) {
                            if (remaining_1 <= 0)
                                return p;
                            var use = Math.min(remaining_1, p.amount);
                            remaining_1 -= use;
                            return __assign(__assign({}, p), { amount: p.amount - use });
                        }).filter(function (p) { return p.amount > 0; });
                    }
                    return [4 /*yield*/, pool.query("UPDATE pokescan_users SET scans_used_today = $1, scan_date = $2, bonus_scan_pools = $3 WHERE id = $4", [newScansUsed, today, JSON.stringify(newPools), userId])];
                case 2:
                    _b.sent();
                    newFreeRemaining = Math.max(0, FREE_SCANS_PER_DAY - newScansUsed);
                    newBonusRemaining = sumPools(newPools);
                    return [2 /*return*/, { allowed: true, freeRemaining: newFreeRemaining, bonusRemaining: newBonusRemaining }];
            }
        });
    });
}
