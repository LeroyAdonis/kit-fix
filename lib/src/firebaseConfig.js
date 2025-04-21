"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.storage = exports.db = exports.auth = void 0;
// Import Firebase SDK
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
// Your Firebase project config (from Firebase Console)
var firebaseConfig = {
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
var app;
if (!(0, app_1.getApps)().length) {
    exports.default = app = (0, app_1.initializeApp)(firebaseConfig);
}
else {
    exports.default = app = (0, app_1.getApp)();
}
// Initialize Firebase services
var auth = (0, auth_1.getAuth)(app);
exports.auth = auth;
var db = (0, firestore_1.getFirestore)(app);
exports.db = db;
var storage = (0, storage_1.getStorage)(app);
exports.storage = storage;
