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
exports.db = exports.pool = void 0;
exports.warmupDb = warmupDb;
var node_postgres_1 = require("drizzle-orm/node-postgres");
var pg_1 = require("pg");
var schema = require("@shared/schema");
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
}
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
exports.db = (0, node_postgres_1.drizzle)(exports.pool, { schema: schema });
function warmupDb() {
    return __awaiter(this, arguments, void 0, function (maxAttempts, delayMs) {
        var attempt, client, err_1, isNeonColdStart;
        var _a, _b;
        if (maxAttempts === void 0) { maxAttempts = 8; }
        if (delayMs === void 0) { delayMs = 2000; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    attempt = 1;
                    _c.label = 1;
                case 1:
                    if (!(attempt <= maxAttempts)) return [3 /*break*/, 10];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 5, , 9]);
                    return [4 /*yield*/, exports.pool.connect()];
                case 3:
                    client = _c.sent();
                    return [4 /*yield*/, client.query("SELECT 1")];
                case 4:
                    _c.sent();
                    client.release();
                    if (attempt > 1) {
                        console.log("[DB] Connected after ".concat(attempt, " attempts"));
                    }
                    return [2 /*return*/];
                case 5:
                    err_1 = _c.sent();
                    isNeonColdStart = ((_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) === null || _a === void 0 ? void 0 : _a.includes("endpoint has been disabled")) ||
                        ((_b = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) === null || _b === void 0 ? void 0 : _b.includes("endpoint is disabled")) ||
                        (err_1 === null || err_1 === void 0 ? void 0 : err_1.code) === "XX000";
                    if (!(isNeonColdStart && attempt < maxAttempts)) return [3 /*break*/, 7];
                    console.log("[DB] Neon cold start, retrying in ".concat(delayMs, "ms (attempt ").concat(attempt, "/").concat(maxAttempts, ")..."));
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, delayMs); })];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    console.warn("[DB] Warmup failed after ".concat(attempt, " attempts:"), err_1 === null || err_1 === void 0 ? void 0 : err_1.message);
                    return [2 /*return*/];
                case 8: return [3 /*break*/, 9];
                case 9:
                    attempt++;
                    return [3 /*break*/, 1];
                case 10: return [2 /*return*/];
            }
        });
    });
}
