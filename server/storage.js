"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.PgStorage = void 0;
var crypto_1 = require("crypto");
var pg_1 = require("pg");
var pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
var PgStorage = /** @class */ (function () {
    function PgStorage() {
    }
    PgStorage.prototype.createUser = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var id, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        return [4 /*yield*/, pool.query("INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\n       RETURNING *", [
                                id,
                                user.username.toLowerCase().trim(),
                                user.displayName.trim(),
                                user.email.toLowerCase().trim(),
                                ((_a = user.mobileNumber) === null || _a === void 0 ? void 0 : _a.trim()) || "",
                                user.passwordHash || null,
                                user.authProvider || "local",
                                user.isPremium || false,
                                user.role || "user",
                                user.avatarUrl || null,
                            ])];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, mapRow(result.rows[0])];
                }
            });
        });
    };
    PgStorage.prototype.importUser = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, pool.query("SELECT id FROM pokescan_users WHERE email = $1", [user.email.toLowerCase().trim()])];
                    case 1:
                        existing = _b.sent();
                        if (existing.rows.length > 0)
                            return [2 /*return*/, { status: "skipped" }];
                        return [4 /*yield*/, pool.query("INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\n       ON CONFLICT (email) DO NOTHING", [user.id, user.username.toLowerCase().trim(), user.displayName.trim(), user.email.toLowerCase().trim(),
                                ((_a = user.mobileNumber) === null || _a === void 0 ? void 0 : _a.trim()) || "", user.passwordHash || null, user.authProvider || "local",
                                user.isPremium || false, user.role || "user", user.avatarUrl || null])];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, { status: "created" }];
                }
            });
        });
    };
    PgStorage.prototype.getUserById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("SELECT * FROM pokescan_users WHERE id = $1", [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] ? mapRow(result.rows[0]) : null];
                }
            });
        });
    };
    PgStorage.prototype.getUserByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("SELECT * FROM pokescan_users WHERE email = $1", [email.toLowerCase().trim()])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] ? mapRow(result.rows[0]) : null];
                }
            });
        });
    };
    PgStorage.prototype.getUserByMobile = function (mobile) {
        return __awaiter(this, void 0, void 0, function () {
            var normalized, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalized = normalizeMobile(mobile);
                        return [4 /*yield*/, pool.query("SELECT * FROM pokescan_users WHERE mobile_number = $1 OR mobile_number = $2", [mobile.trim(), normalized])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] ? mapRow(result.rows[0]) : null];
                }
            });
        });
    };
    PgStorage.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("SELECT * FROM pokescan_users WHERE username = $1", [username.toLowerCase().trim()])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] ? mapRow(result.rows[0]) : null];
                }
            });
        });
    };
    PgStorage.prototype.getAllUsers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("SELECT * FROM pokescan_users ORDER BY created_at DESC")];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.map(mapRow)];
                }
            });
        });
    };
    PgStorage.prototype.updateUser = function (id, fields) {
        return __awaiter(this, void 0, void 0, function () {
            var sets, values, idx, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sets = [];
                        values = [];
                        idx = 1;
                        if (fields.isPremium !== undefined) {
                            sets.push("is_premium = $".concat(idx++));
                            values.push(fields.isPremium);
                        }
                        if (fields.role !== undefined) {
                            sets.push("role = $".concat(idx++));
                            values.push(fields.role);
                        }
                        if (fields.avatarUrl !== undefined) {
                            sets.push("avatar_url = $".concat(idx++));
                            values.push(fields.avatarUrl);
                        }
                        if (fields.displayName !== undefined) {
                            sets.push("display_name = $".concat(idx++));
                            values.push(fields.displayName);
                        }
                        if (fields.email !== undefined) {
                            sets.push("email = $".concat(idx++));
                            values.push(fields.email.toLowerCase().trim());
                        }
                        if (fields.mobileNumber !== undefined) {
                            sets.push("mobile_number = $".concat(idx++));
                            values.push(fields.mobileNumber.trim());
                        }
                        if (fields.stripeCustomerId !== undefined) {
                            sets.push("stripe_customer_id = $".concat(idx++));
                            values.push(fields.stripeCustomerId);
                        }
                        if (fields.stripeSubscriptionId !== undefined) {
                            sets.push("stripe_subscription_id = $".concat(idx++));
                            values.push(fields.stripeSubscriptionId);
                        }
                        if (fields.stripePriceId !== undefined) {
                            sets.push("stripe_price_id = $".concat(idx++));
                            values.push(fields.stripePriceId);
                        }
                        if (fields.subscriptionStatus !== undefined) {
                            sets.push("subscription_status = $".concat(idx++));
                            values.push(fields.subscriptionStatus);
                        }
                        if (fields.subscriptionPeriodEnd !== undefined) {
                            sets.push("subscription_period_end = $".concat(idx++));
                            values.push(fields.subscriptionPeriodEnd);
                        }
                        if (fields.collectionVisible !== undefined) {
                            sets.push("collection_visible = $".concat(idx++));
                            values.push(fields.collectionVisible);
                        }
                        if (fields.emailVerified !== undefined) {
                            sets.push("email_verified = $".concat(idx++));
                            values.push(fields.emailVerified);
                        }
                        if (sets.length === 0)
                            return [2 /*return*/, this.getUserById(id)];
                        values.push(id);
                        return [4 /*yield*/, pool.query("UPDATE pokescan_users SET ".concat(sets.join(", "), " WHERE id = $").concat(idx, " RETURNING *"), values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] ? mapRow(result.rows[0]) : null];
                }
            });
        });
    };
    PgStorage.prototype.setPassword = function (userId, passwordHash) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("UPDATE pokescan_users SET password_hash = $1 WHERE id = $2", [passwordHash, userId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PgStorage.prototype.createSession = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token = (0, crypto_1.randomBytes)(32).toString("hex");
                        return [4 /*yield*/, pool.query("INSERT INTO pokescan_sessions (token, user_id, expires_at)\n       VALUES ($1, $2, NOW() + INTERVAL '30 days')", [token, userId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, token];
                }
            });
        });
    };
    PgStorage.prototype.validateSession = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("SELECT u.* FROM pokescan_users u\n       JOIN pokescan_sessions s ON s.user_id = u.id\n       WHERE s.token = $1 AND s.expires_at > NOW()", [token])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] ? mapRow(result.rows[0]) : null];
                }
            });
        });
    };
    PgStorage.prototype.deleteSession = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("DELETE FROM pokescan_sessions WHERE token = $1", [token])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PgStorage.prototype.deleteAllUserSessions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("DELETE FROM pokescan_sessions WHERE user_id = $1", [userId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PgStorage.prototype.deleteUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pool.query("DELETE FROM pokescan_users WHERE id = $1", [id])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return PgStorage;
}());
exports.PgStorage = PgStorage;
function mapRow(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        mobileNumber: row.mobile_number,
        passwordHash: row.password_hash,
        authProvider: row.auth_provider,
        isPremium: row.is_premium,
        role: row.role,
        avatarUrl: row.avatar_url,
        createdAt: (_c = (_b = (_a = row.created_at) === null || _a === void 0 ? void 0 : _a.toISOString) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : row.created_at,
        stripeCustomerId: (_d = row.stripe_customer_id) !== null && _d !== void 0 ? _d : null,
        stripeSubscriptionId: (_e = row.stripe_subscription_id) !== null && _e !== void 0 ? _e : null,
        stripePriceId: (_f = row.stripe_price_id) !== null && _f !== void 0 ? _f : null,
        subscriptionStatus: (_g = row.subscription_status) !== null && _g !== void 0 ? _g : null,
        subscriptionPeriodEnd: (_h = row.subscription_period_end) !== null && _h !== void 0 ? _h : null,
        scansUsedToday: (_j = row.scans_used_today) !== null && _j !== void 0 ? _j : 0,
        scanDate: (_k = row.scan_date) !== null && _k !== void 0 ? _k : null,
        consecutiveLoginDays: (_l = row.consecutive_login_days) !== null && _l !== void 0 ? _l : 0,
        lastLoginDate: (_m = row.last_login_date) !== null && _m !== void 0 ? _m : null,
        bonusScanPools: (_o = row.bonus_scan_pools) !== null && _o !== void 0 ? _o : null,
        chatMutedUntil: (_p = row.chat_muted_until) !== null && _p !== void 0 ? _p : null,
        chatBannedUntil: (_q = row.chat_banned_until) !== null && _q !== void 0 ? _q : null,
        bannedUntil: (_r = row.banned_until) !== null && _r !== void 0 ? _r : null,
        banReason: (_s = row.ban_reason) !== null && _s !== void 0 ? _s : null,
        bannedAt: (_t = row.banned_at) !== null && _t !== void 0 ? _t : null,
        bannedBy: (_u = row.banned_by) !== null && _u !== void 0 ? _u : null,
        isTrialUsed: (_v = row.is_trial_used) !== null && _v !== void 0 ? _v : false,
        collectionVisible: (_w = row.collection_visible) !== null && _w !== void 0 ? _w : false,
        emailVerified: (_x = row.email_verified) !== null && _x !== void 0 ? _x : false,
        isVerifiedCollector: (_y = row.is_verified_collector) !== null && _y !== void 0 ? _y : false,
    };
}
function normalizeMobile(mobile) {
    var digits = mobile.replace(/\D/g, "");
    if (digits.startsWith("0") && digits.length === 11) {
        return "+44" + digits.slice(1);
    }
    if (!mobile.startsWith("+")) {
        return "+" + digits;
    }
    return mobile.trim();
}
exports.storage = new PgStorage();
