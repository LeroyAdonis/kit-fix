import {
  onDocumentUpdated,
  FirestoreEvent
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Change } from "firebase-functions";
import { Resend } from "resend";
import * as dotenv from "dotenv";
dotenv.config();

admin.initializeApp();

const resend = new Resend(process.env.RESEND_KEY);

import { QueryDocumentSnapshot } from "firebase-admin/firestore";

export const notifyOnDelivery = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "us-central1"
  },
  async (
    event: FirestoreEvent<
      Change<QueryDocumentSnapshot> | undefined,
      { orderId: string }
    >
  ) => {
    const change = event.data;

    if (!change || !change.before.exists || !change.after.exists) {
      console.log("Missing document data, skipping.");
      return;
    }

    const before = change.before.data();
    const after = change.after.data();

    const customerEmail = after.contactInfo?.email;
    const customerName = after.contactInfo?.name || "Customer";

    const wasDelivered = before.processing?.delivered;
    const isDelivered = after.processing?.delivered;

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

        console.log(
          `✅ Delivery email sent to ${customerEmail} for order ${event.params.orderId}`
        );
      } catch (error) {
        console.error("❌ Resend email error:", error);
      }
    }
  }
);
