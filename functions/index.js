// functions/index.js
// Import necessary modules using CommonJS require syntax
const functions = require("firebase-functions"); // Import functions to access config
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger"); // Use require for logger
const nodemailer = require("nodemailer"); // Use require for nodemailer

// Initialize Firebase Admin SDK
initializeApp();

// Use Firestore emulator if running locally
if (process.env.FIRESTORE_EMULATOR_HOST) {
  const firestore = getFirestore();
  firestore.settings({
    host: process.env.FIRESTORE_EMULATOR_HOST,
    ssl: false
  });
}

// --- Nodemailer Configuration ---
// Configure the email transport using the Nodemailer library.
// Sensitive information like Brevo user/pass should be stored in Functions config.
// Run: firebase functions:config:set brevo.user="your_brevo_user" brevo.pass="your_brevo_smtp_key" email.from="your_sending_email@example.com"
let transporter;
let senderEmail;
try {
  const brevoUser = functions.config().brevo?.user;
  const brevoPass = functions.config().brevo?.pass;
  senderEmail = functions.config().email?.from; // Load sender email from config

  if (!brevoUser || !brevoPass) {
    logger.error(
      "Brevo user or password not found in Firebase Functions config. Set using 'firebase functions:config:set brevo.user=... brevo.pass=...'"
    );
  } else if (!senderEmail) {
    logger.error(
      "Sender email not found in Firebase Functions config. Set using 'firebase functions:config:set email.from=...'"
    );
  } else {
    transporter = nodemailer.createTransport({
      host: "smtp-relay.sendinblue.com", // Brevo SMTP host
      port: 587,
      secure: false, // use false for STARTTLS on port 587
      auth: {
        user: brevoUser,
        pass: brevoPass
      }
    });
    logger.info("Nodemailer transporter configured successfully for Brevo.");
  }
} catch (error) {
  logger.error(
    "Error accessing Firebase Functions config or configuring Nodemailer:",
    error
  );
  // Consider if the function should fail deployment if email config is missing
}

// --- sendOrderStatusEmail ---
// Cloud Function triggered on Order Document Update (using v2 SDK)
exports.sendOrderStatusEmail = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    // Check if transporter is configured before proceeding
    if (!transporter || !senderEmail) {
      logger.error(
        "Nodemailer transporter or sender email not configured. Cannot send emails. Exiting function."
      );
      return null;
    }

    const snapshotBefore = event.data?.before; // Use optional chaining
    const snapshotAfter = event.data?.after; // Use optional chaining

    if (!snapshotBefore || !snapshotAfter) {
      logger.warn(
        // Use logger consistently
        `Order ${event.params.orderId} triggered update but snapshots are missing. Skipping.`
      );
      return null;
    }

    const beforeData = snapshotBefore.data() || {}; // Default to empty object if data is missing
    const afterData = snapshotAfter.data() || {}; // Default to empty object if data is missing
    const orderId = event.params.orderId;

    logger.info(`Order ${orderId} updated. Checking for status changes.`); // Use logger

    // Use optional chaining defensively when accessing nested properties
    const processingBefore = beforeData.processing || {};
    const processingAfter = afterData.processing || {};
    const paymentBefore = beforeData.payment || {};
    const paymentAfter = afterData.payment || {};

    // --- Trigger 1: Order Confirmed (Payment Status Change) ---
    const paymentStatusBefore = paymentBefore.status;
    const paymentStatusAfter = paymentAfter.status;

    if (paymentStatusBefore !== "paid" && paymentStatusAfter === "paid") {
      logger.info(
        `Order ${orderId} payment status changed to paid. Sending confirmation email.`
      );
      await sendConfirmationEmail(afterData, orderId);
    }

    // --- Trigger 2: Order Goes Into Repair (Repair Status Change) ---
    const repairStatusBefore = processingBefore.repairStatus;
    const repairStatusAfter = processingAfter.repairStatus;

    // Trigger when repairStatus changes to 'In Repair'
    if (
      repairStatusBefore !== "In Repair" &&
      repairStatusAfter === "In Repair"
    ) {
      logger.info(
        `Order ${orderId} repairStatus changed to In Repair. Sending notification email.`
      );
      await sendInRepairEmail(afterData, orderId);
    }

    // --- Trigger 3: Order Ready for Fulfillment (Main Status Change) ---
    const statusBefore = processingBefore.status;
    const statusAfter = processingAfter.status;

    // Trigger when main status changes to 'awaiting_fulfillment'
    if (
      statusBefore !== "awaiting_fulfillment" &&
      statusAfter === "awaiting_fulfillment"
    ) {
      logger.info(
        `Order ${orderId} status changed to awaiting_fulfillment. Sending notification email.`
      );
      // Determine fulfillment method to provide context in the email
      const fulfillmentMethod = processingAfter.fulfillmentMethod;
      await sendReadyForFulfillmentEmail(afterData, orderId, fulfillmentMethod);
    }

    // Optional: Add more triggers here for other key status changes if needed
    // Example: When status changes to 'fulfilled' (Delivered/Picked Up)
    // if (statusBefore !== 'fulfilled' && statusAfter === 'fulfilled') {
    //      logger.info(`Order ${orderId} status changed to fulfilled. Sending completion email.`);
    //      await sendOrderFulfilledEmail(afterData, orderId);
    // }
    // Example: When status changes to 'cancelled'
    // if (statusBefore !== 'cancelled' && statusAfter === 'cancelled') {
    //      logger.info(`Order ${orderId} status changed to cancelled. Sending cancellation email.`);
    //      await sendOrderCancelledEmail(afterData, orderId);
    // }

    logger.info(
      `Order ${orderId} update processed. No further relevant status changes detected for email triggers.`
    );
    return null; // Indicate that the function completed
  }
);

// --- Email Sending Helper Functions ---

// Helper function to safely send email
async function safeSendEmail(mailOptions, orderId, emailType) {
  if (!transporter || !senderEmail) {
    logger.error(
      `Nodemailer not configured. Cannot send ${emailType} email for order ${orderId}.`
    );
    return;
  }
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(
      `${emailType} email sent for order ${orderId}: ${info.messageId}`
    );
  } catch (error) {
    logger.error(
      `Error sending ${emailType} email for order ${orderId}:`,
      error
    );
    // Log more details about the SMTP error if possible
    if (error.response) {
      logger.error("SMTP Response:", error.response);
    }
    // Consider adding retry logic or notifying admin of persistent failures
  }
}

// Send email when order is confirmed/paid
async function sendConfirmationEmail(orderData, orderId) {
  const customerEmail = orderData.contactInfo?.email;
  const adminEmail = "admin@kitfix.co.za"; // Your admin email recipient

  if (!customerEmail && !adminEmail) {
    logger.warn(
      `No recipients for order ${orderId}. Skipping confirmation email.`
    );
    return;
  }

  const recipients = [customerEmail, adminEmail].filter(Boolean); // Filter out null/undefined

  // Ensure senderEmail is defined (checked at the top level now)
  if (!senderEmail) return;

  const mailOptions = {
    from: `"KitFix" <${senderEmail}>`, // Sender address with name
    to: recipients.join(","), // Comma-separated list of recipients
    subject: `KitFix Order #${orderId
      .slice(0, 6)
      .toUpperCase()} Confirmed & Paid`,
    text: `
            Hello ${orderData.contactInfo?.name || "Customer"},

            Thank you for your order! Your payment for Order #${orderId
              .slice(0, 6)
              .toUpperCase()} has been confirmed.

            Order Details:
            - Amount Paid: R${orderData.payment?.amount?.toFixed(2) || "0.00"}
            - Payment Method: ${orderData.payment?.method || "N/A"}
            - Initial Method: ${orderData.processing?.initialMethod || "N/A"}
            - Return Method: ${orderData.processing?.fulfillmentMethod || "N/A"}
            - Preferred Date: ${orderData.processing?.preferredDate || "N/A"}

            We will begin processing your order shortly. You can track the progress in your dashboard.

            Thank you for choosing KitFix!

            KitFix Team
        `,
    html: `
             <p>Hello ${orderData.contactInfo?.name || "Customer"},</p>
             <p>Thank you for your order! Your payment for Order <strong>#${orderId
               .slice(0, 6)
               .toUpperCase()}</strong> has been confirmed.</p>
             <p>Your jersey repair is now in process.</p>
             <h3>Order Details:</h3>
             <ul>
                 <li><strong>Amount Paid:</strong> R${
                   orderData.payment?.amount?.toFixed(2) || "0.00"
                 }</li>
                 <li><strong>Payment Method:</strong> ${
                   orderData.payment?.method || "N/A"
                 }</li>
                 <li><strong>Initial Method:</strong> ${
                   orderData.processing?.initialMethod || "N/A"
                 }</li>
                 <li><strong>Return Method:</strong> ${
                   orderData.processing?.fulfillmentMethod || "N/A"
                 }</li>
                 <li><strong>Preferred Date:</strong> ${
                   orderData.processing?.preferredDate || "N/A"
                 }</li>
             </ul>
             <p>We will begin processing your order shortly. You can track the progress in your <a href="YOUR_CUSTOMER_DASHBOARD_URL">dashboard</a>.</p> {/* Replace YOUR_CUSTOMER_DASHBOARD_URL */}
             <p>Thank you for choosing KitFix!</p>
             <p>KitFix Team</p>
         ` // Ensure placeholder URL is replaced or removed
  };

  await safeSendEmail(mailOptions, orderId, "Confirmation");
}

// Send email when order status changes to 'In Repair'
async function sendInRepairEmail(orderData, orderId) {
  const customerEmail = orderData.contactInfo?.email;
  const adminEmail = "admin@kitfix.co.za"; // Your admin email recipient

  if (!customerEmail && !adminEmail) {
    logger.warn(
      `No recipients for order ${orderId}. Skipping In Repair email.`
    );
    return;
  }
  const recipients = [customerEmail, adminEmail].filter(Boolean);

  // Ensure senderEmail is defined
  if (!senderEmail) return;

  const mailOptions = {
    from: `"KitFix" <${senderEmail}>`,
    to: recipients.join(","),
    subject: `KitFix Order #${orderId
      .slice(0, 6)
      .toUpperCase()} Is Now In Repair`,
    text: `
            Hello ${orderData.contactInfo?.name || "Customer"},

            Good news! Your jersey for Order #${orderId
              .slice(0, 6)
              .toUpperCase()} is now in the repair process.

            We are carefully restoring your item and will notify you once the repair is completed and ready for the next step.

            You can check the latest status in your dashboard.

            KitFix Team
        `,
    html: `
            <p>Hello ${orderData.contactInfo?.name || "Customer"},</p>
            <p>Good news! Your jersey for Order <strong>#${orderId
              .slice(0, 6)
              .toUpperCase()}</strong> is now in the repair process.</p>
            <p>We're carefully restoring your item!</p>
            <p>We will notify you once the repair is completed and ready for the next step.</p>
            <p>You can check the latest status in your <a href="YOUR_CUSTOMER_DASHBOARD_URL">dashboard</a>.</p> {/* Replace YOUR_CUSTOMER_DASHBOARD_URL */}
            <p>KitFix Team</p>
        ` // Ensure placeholder URL is replaced or removed
  };

  await safeSendEmail(mailOptions, orderId, '"In Repair"');
}

// Send email when order status changes to 'awaiting_fulfillment'
async function sendReadyForFulfillmentEmail(
  orderData,
  orderId,
  fulfillmentMethod
) {
  const customerEmail = orderData.contactInfo?.email;
  const adminEmail = "admin@kitfix.co.za"; // Your admin email recipient

  if (!customerEmail && !adminEmail) {
    logger.warn(
      `No recipients for order ${orderId}. Skipping fulfillment email.`
    );
    return;
  }
  const recipients = [customerEmail, adminEmail].filter(Boolean);

  // Ensure senderEmail is defined
  if (!senderEmail) return;

  const fulfillmentDetailText =
    fulfillmentMethod === "pickup"
      ? `ready for customer pickup at KitFix.`
      : fulfillmentMethod === "delivery"
      ? `ready to be shipped for delivery.` // Use different text for delivery
      : `ready for fulfillment.`; // Fallback

  const fulfillmentDetailHtml =
    fulfillmentMethod === "pickup"
      ? `ready for <strong>customer pickup</strong> at KitFix.`
      : fulfillmentMethod === "delivery"
      ? `ready to be shipped for <strong>delivery</strong>.`
      : `ready for fulfillment.`; // Fallback

  const mailOptions = {
    from: `"KitFix" <${senderEmail}>`,
    to: recipients.join(","),
    subject: `KitFix Order #${orderId
      .slice(0, 6)
      .toUpperCase()} Ready for Fulfillment`,
    text: `
            Hello ${orderData.contactInfo?.name || "Customer"},

            Great news! The repair for your jersey (Order #${orderId
              .slice(0, 6)
              .toUpperCase()}) is now complete.

            Your order is now ${fulfillmentDetailText}

            ${
              fulfillmentMethod === "pickup"
                ? "Please visit KitFix during our operating hours to pick up your jersey."
                : fulfillmentMethod === "delivery"
                ? "We will prepare your order for shipping shortly."
                : "We will be in touch regarding the final arrangements."
            }

            You can check the latest status in your dashboard.

            Thank you for choosing KitFix!

            KitFix Team
        `,
    html: `
            <p>Hello ${orderData.contactInfo?.name || "Customer"},</p>
            <p>Great news! The repair for your jersey (Order <strong>#${orderId
              .slice(0, 6)
              .toUpperCase()}</strong>) is now complete.</p>
            <p>Your order is now ${fulfillmentDetailHtml}</p>
            <p>
                ${
                  fulfillmentMethod === "pickup"
                    ? "Please visit KitFix during our operating hours to pick up your jersey."
                    : fulfillmentMethod === "delivery"
                    ? "We will prepare your order for shipping shortly."
                    : "We will be in touch shortly regarding the final arrangements."
                }
            </p>
            <p>You can check the latest status in your <a href="YOUR_CUSTOMER_DASHBOARD_URL">dashboard</a>.</p> {/* Replace YOUR_CUSTOMER_DASHBOARD_URL */}
            <p>Thank you for choosing KitFix!</p>
            <p>KitFix Team</p>
        ` // Ensure placeholder URL is replaced or removed
  };

  await safeSendEmail(mailOptions, orderId, '"Ready for Fulfillment"');
}

// Optional: Add email for 'fulfilled' status (Delivered/Picked Up)
// async function sendOrderFulfilledEmail(orderData, orderId) {
//     const customerEmail = orderData.contactInfo?.email;
//     const adminEmail = 'admin@kitfix.co.za'; // Your admin email
//     const fulfillmentMethod = orderData.processing?.fulfillmentMethod;
//
//     if (!customerEmail && !adminEmail) {
//          logger.warn(`No recipients for order ${orderId}. Skipping fulfillment completion email.`);
//          return;
//     }
//
//     // Ensure senderEmail is defined
//     if (!senderEmail) return;
//
//     const recipients = [customerEmail, adminEmail].filter(Boolean); // Filter out null/undefined
//
//     const fulfillmentDetail = fulfillmentMethod === 'pickup'
//         ? `picked up.`
//         : fulfillmentMethod === 'delivery'
//             ? `delivered.`
//             : `fulfilled.`; // Fallback
//
//     const mailOptions = {
//         from: `"KitFix" <${senderEmail}>`,
//         to: recipients.join(','), // Comma-separated list of recipients
//         subject: `KitFix Order #${orderId.slice(0, 6).toUpperCase()} Fulfilled!`,
//         text: `
//             Hello ${orderData.contactInfo?.name || 'Customer'},
//             Your order #${orderId.slice(0, 6).toUpperCase()} has been successfully ${fulfillmentDetail}
//             Thank you for your business!
//             KitFix Team
//         `,
//         html: `
//             <p>Hello ${orderData.contactInfo?.name || 'Customer'},</p>
//             <p>Your order <strong>#${orderId.slice(0, 6).toUpperCase()}</strong> has been successfully ${fulfillmentDetail}</p>
//             <p>Thank you for your business!</p>
//             <p>KitFix Team</p>
//         `,
//     };
//
//     await safeSendEmail(mailOptions, orderId, '"Fulfilled"');
// }

// You can uncomment and deploy the optional fulfilled email trigger if needed.
