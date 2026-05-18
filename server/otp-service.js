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
exports.createOtp = createOtp;
exports.verifyOtp = verifyOtp;
exports.sendOtpByEmail = sendOtpByEmail;
exports.sendOtpBySms = sendOtpBySms;
var crypto_1 = require("crypto");
var nodemailer_1 = require("nodemailer");
var otpStore = new Map();
var rateLimitStore = new Map();
var MAX_OTP_ATTEMPTS = 5;
var RATE_LIMIT_WINDOW = 60 * 1000;
var RATE_LIMIT_MAX = 3;
function generateOtp() {
    return (0, crypto_1.randomInt)(100000, 999999).toString();
}
function normalizeCredential(credential) {
    return credential.toLowerCase().trim();
}
function isRateLimited(key) {
    var entry = rateLimitStore.get(key);
    if (!entry)
        return false;
    if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(key);
        return false;
    }
    return entry.count >= RATE_LIMIT_MAX;
}
function recordRateLimit(key) {
    var entry = rateLimitStore.get(key);
    if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitStore.set(key, { count: 1, windowStart: Date.now() });
    }
    else {
        entry.count++;
    }
}
function createOtp(credential) {
    var key = normalizeCredential(credential);
    if (isRateLimited(key)) {
        return { code: "", rateLimited: true };
    }
    recordRateLimit(key);
    var code = generateOtp();
    otpStore.set(key, {
        code: code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        credential: key,
        attempts: 0,
    });
    return { code: code, rateLimited: false };
}
function verifyOtp(credential, code) {
    var key = normalizeCredential(credential);
    var entry = otpStore.get(key);
    if (!entry)
        return { valid: false, expired: true, tooManyAttempts: false };
    if (Date.now() > entry.expiresAt) {
        otpStore.delete(key);
        return { valid: false, expired: true, tooManyAttempts: false };
    }
    if (entry.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(key);
        return { valid: false, expired: false, tooManyAttempts: true };
    }
    entry.attempts++;
    if (entry.code !== code.trim()) {
        return { valid: false, expired: false, tooManyAttempts: false };
    }
    otpStore.delete(key);
    return { valid: true, expired: false, tooManyAttempts: false };
}
function createEmailTransport() {
    var host = process.env.SMTP_HOST;
    var port = parseInt(process.env.SMTP_PORT || "587", 10);
    var user = process.env.SMTP_USER;
    var pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        return null;
    }
    return nodemailer_1.default.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: { user: user, pass: pass },
    });
}
function sendOtpByEmail(email, code) {
    return __awaiter(this, void 0, void 0, function () {
        var transporter, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transporter = createEmailTransport();
                    if (!transporter) {
                        // Always log when SMTP is not configured — check server logs to retrieve code
                        console.log("[OTP] No SMTP configured. Code for ".concat(email, ": ").concat(code));
                        return [2 /*return*/, true];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, transporter.sendMail({
                            from: process.env.SMTP_USER,
                            to: email,
                            subject: "Your PokeScan Verification Code",
                            text: "Your PokeScan verification code is: ".concat(code, "\n\nThis code expires in 10 minutes."),
                            html: "\n        <div style=\"font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;\">\n          <h2 style=\"color: #CC0000;\">PokeScan Verification</h2>\n          <p>Your one-time verification code is:</p>\n          <div style=\"font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #CC0000; padding: 16px; background: #FFF0F0; border-radius: 8px; text-align: center;\">".concat(code, "</div>\n          <p style=\"color: #666; font-size: 13px; margin-top: 16px;\">This code expires in 10 minutes. Do not share it with anyone.</p>\n        </div>\n      "),
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    err_1 = _a.sent();
                    console.error("Failed to send OTP email:", err_1);
                    // Log the code so logins aren't completely blocked on email failure
                    console.log("[OTP] Email failed. Code for ".concat(email, ": ").concat(code));
                    return [2 /*return*/, true];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function sendOtpBySms(mobile, code) {
    return __awaiter(this, void 0, void 0, function () {
        var accountSid, authToken, fromNumber, twilio, client, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountSid = process.env.TWILIO_ACCOUNT_SID;
                    authToken = process.env.TWILIO_AUTH_TOKEN;
                    fromNumber = process.env.TWILIO_PHONE_NUMBER;
                    if (!accountSid || !authToken || !fromNumber) {
                        // Always log when SMS is not configured — check server logs to retrieve code
                        console.log("[OTP] No SMS configured. Code for ".concat(mobile, ": ").concat(code));
                        return [2 /*return*/, true];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("twilio"); })];
                case 2:
                    twilio = (_a.sent()).default;
                    client = twilio(accountSid, authToken);
                    return [4 /*yield*/, client.messages.create({
                            body: "Your PokeScan verification code is: ".concat(code, ". Expires in 10 minutes."),
                            from: fromNumber,
                            to: mobile,
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, true];
                case 4:
                    err_2 = _a.sent();
                    console.error("Failed to send OTP SMS:", err_2);
                    // Log the code so logins aren't completely blocked on SMS failure
                    console.log("[OTP] SMS failed. Code for ".concat(mobile, ": ").concat(code));
                    return [2 /*return*/, true];
                case 5: return [2 /*return*/];
            }
        });
    });
}
setInterval(function () {
    var now = Date.now();
    for (var _i = 0, _a = otpStore.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (now > entry.expiresAt)
            otpStore.delete(key);
    }
    for (var _c = 0, _d = rateLimitStore.entries(); _c < _d.length; _c++) {
        var _e = _d[_c], key = _e[0], entry = _e[1];
        if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2)
            rateLimitStore.delete(key);
    }
}, 5 * 60 * 1000);
