import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import admin from "firebase-admin";

// Web client Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Admin SDK configuration
let adminConfig;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    adminConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Error parsing Firebase service account JSON:", e);
    // Fall back to credential cert if available
    if (process.env.FIREBASE_PROJECT_ID) {
      adminConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };
    }
  }
}

// Initialize Firebase for client
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Firebase Admin
let adminApp;
try {
  if (adminConfig) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(adminConfig)
    });
  } else {
    // Use default application credentials
    adminApp = admin.initializeApp();
  }
  console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

export const adminAuth = adminApp ? admin.auth(adminApp) : null;
export const adminDb = adminApp ? admin.firestore(adminApp) : null;

// Helper function to check if Firebase is properly configured
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}