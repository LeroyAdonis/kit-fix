// Import Firebase Admin SDK
import * as admin from "firebase-admin";

// Get the service account key (like a password)
import serviceAccount from "./src/admin/kitfix-63a88-firebase-adminsdk-fbsvc-e679494d70.json";

// Initialize Firebase Admin (like turning on admin powers)
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    }),
    databaseURL: "firebase-adminsdk-fbsvc@kitfix-63a88.iam.gserviceaccount.com" // From Firebase settings
  });
} catch {
  console.log("Admin already initialized");
}

// Export admin tools
export const adminAuth = admin.auth();
export const firestore = admin.firestore();
