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
exports.getUncachableStripeClient = getUncachableStripeClient;
exports.getStripePublishableKey = getStripePublishableKey;
exports.ensureStripeCustomer = ensureStripeCustomer;
/**
 * Stripe integration — Replit connector pattern
 * Never cache the client; tokens expire.
 */
var stripe_1 = require("stripe");
function getCredentials() {
    return __awaiter(this, void 0, void 0, function () {
        var hostname, xReplitToken, sk, pk, isProduction, environments, _i, environments_1, env, url, response, data, conn;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
                    xReplitToken = process.env.REPL_IDENTITY
                        ? "repl " + process.env.REPL_IDENTITY
                        : process.env.WEB_REPL_RENEWAL
                            ? "depl " + process.env.WEB_REPL_RENEWAL
                            : null;
                    if (!xReplitToken || !hostname) {
                        sk = process.env.STRIPE_SECRET_KEY;
                        pk = process.env.STRIPE_PUBLISHABLE_KEY;
                        if (sk && pk)
                            return [2 /*return*/, { secretKey: sk, publishableKey: pk }];
                        throw new Error("Stripe credentials not found. Set up the Stripe connector or STRIPE_SECRET_KEY env var.");
                    }
                    isProduction = process.env.REPLIT_DEPLOYMENT === "1";
                    environments = isProduction ? ["production", "development"] : ["development", "production"];
                    _i = 0, environments_1 = environments;
                    _d.label = 1;
                case 1:
                    if (!(_i < environments_1.length)) return [3 /*break*/, 5];
                    env = environments_1[_i];
                    url = new URL("https://".concat(hostname, "/api/v2/connection"));
                    url.searchParams.set("include_secrets", "true");
                    url.searchParams.set("connector_names", "stripe");
                    url.searchParams.set("environment", env);
                    return [4 /*yield*/, fetch(url.toString(), {
                            headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
                        })];
                case 2:
                    response = _d.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _d.sent();
                    conn = (_a = data.items) === null || _a === void 0 ? void 0 : _a[0];
                    if (((_b = conn === null || conn === void 0 ? void 0 : conn.settings) === null || _b === void 0 ? void 0 : _b.secret) && ((_c = conn === null || conn === void 0 ? void 0 : conn.settings) === null || _c === void 0 ? void 0 : _c.publishable)) {
                        return [2 /*return*/, { secretKey: conn.settings.secret, publishableKey: conn.settings.publishable }];
                    }
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: throw new Error("Stripe connection not found. Set up the Stripe connector in Replit integrations.");
            }
        });
    });
}
function getUncachableStripeClient() {
    return __awaiter(this, void 0, void 0, function () {
        var secretKey;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getCredentials()];
                case 1:
                    secretKey = (_a.sent()).secretKey;
                    return [2 /*return*/, new stripe_1.default(secretKey, { apiVersion: "2025-08-27.basil" })];
            }
        });
    });
}
function getStripePublishableKey() {
    return __awaiter(this, void 0, void 0, function () {
        var publishableKey;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getCredentials()];
                case 1:
                    publishableKey = (_a.sent()).publishableKey;
                    return [2 /*return*/, publishableKey];
            }
        });
    });
}
/**
 * Ensure the user has a valid Stripe customer in the CURRENT mode (test/live).
 * Auto-recreates and persists a fresh customer if the stored ID is missing,
 * invalid, or belongs to the other Stripe mode (e.g. after switching keys).
 */
function ensureStripeCustomer(stripe, user) {
    return __awaiter(this, void 0, void 0, function () {
        var storage, stored, existing, err_1, fresh;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("./storage"); })];
                case 1:
                    storage = (_a.sent()).storage;
                    stored = user.stripeCustomerId;
                    if (!stored) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, stripe.customers.retrieve(stored)];
                case 3:
                    existing = _a.sent();
                    if (existing && !existing.deleted) {
                        return [2 /*return*/, stored];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    // Falls through to recreate. Common causes:
                    //   - "No such customer" (test ID used with live key, or vice-versa)
                    //   - Customer was deleted in the Stripe dashboard
                    console.warn("[Stripe] Stored customer ".concat(stored, " invalid for current mode (").concat(err_1.message, "). Recreating..."));
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, stripe.customers.create({
                        email: user.email,
                        name: user.displayName,
                        metadata: { pokescanUserId: user.id },
                    })];
                case 6:
                    fresh = _a.sent();
                    return [4 /*yield*/, storage.updateUser(user.id, { stripeCustomerId: fresh.id })];
                case 7:
                    _a.sent();
                    return [2 /*return*/, fresh.id];
            }
        });
    });
}
