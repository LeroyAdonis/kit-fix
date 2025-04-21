// Import Firebase SDK
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase project config (from Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyC2HHEokZNkXW7Ca_b1cfCX_H30rkN1tus",
    authDomain: "kitfix-63a88.firebaseapp.com",
    projectId: "kitfix-63a88",
    storageBucket: "kitfix-63a88.firebasestorage.app",
    messagingSenderId: "774238197991",
    appId: "1:774238197991:web:8ddb638a58227952da6a42",
    measurementId: "G-0784J9PX64"
};

// Initialize Firebase
// Initialize Firebase
let app;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}


// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase services
export { auth, db, storage, app as default };