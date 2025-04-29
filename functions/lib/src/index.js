"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyOnDelivery = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const resend_1 = require("resend");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
admin.initializeApp();
const resend = new resend_1.Resend(process.env.RESEND_KEY);
exports.notifyOnDelivery = (0, firestore_1.onDocumentUpdated)({
    document: "orders/{orderId}",
    region: "us-central1"
}, async (event) => {
    var _a, _b, _c, _d;
    const change = event.data;
    if (!change || !change.before.exists || !change.after.exists) {
        console.log("Missing document data, skipping.");
        return;
    }
    const before = change.before.data();
    const after = change.after.data();
    const customerEmail = (_a = after.contactInfo) === null || _a === void 0 ? void 0 : _a.email;
    const customerName = ((_b = after.contactInfo) === null || _b === void 0 ? void 0 : _b.name) || "Customer";
    const wasDelivered = (_c = before.processing) === null || _c === void 0 ? void 0 : _c.delivered;
    const isDelivered = (_d = after.processing) === null || _d === void 0 ? void 0 : _d.delivered;
    if (!wasDelivered && isDelivered && customerEmail) {
        try {
            await resend.emails.send({
                from: "KitFix <notifications@kitfix.com>",
                to: customerEmail,
                subject: "Your jersey has been delivered!",
                html: `
            <h2>Hi ${customerName},</h2>
            <p>Your jersey from KitFix has just been delivered!</p>
            <p>We hope it’s as good as new. If you have feedback, just hit reply.</p>
            <br/>
            <p>Thanks for choosing <strong>KitFix</strong>!</p>
          `
            });
            console.log(`✅ Delivery email sent to ${customerEmail} for order ${event.params.orderId}`);
        }
        catch (error) {
            console.error("❌ Resend email error:", error);
        }
    }
});
//# sourceMappingURL=index.js.map