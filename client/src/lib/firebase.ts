
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration 
// To fix the auth/unauthorized-domain error:
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Select your project
// 3. Go to "Authentication" section
// 4. Click on "Settings" tab
// 5. Under "Authorized domains", add your Replit domain (*.replit.dev or the custom domain you use)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Add login hint parameter to make login faster
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Function to display Firebase domain setup instructions
export function displayFirebaseSetupInstructions() {
  // Get the current domain for the instructions
  const currentDomain = window.location.hostname;
  
  alert(`
Firebase Authentication Domain Setup Instructions:

To fix the unauthorized domain error:

1. Go to Firebase Console (console.firebase.google.com)
2. Select your project
3. Go to "Authentication" section
4. Click on "Settings" tab
5. Under "Authorized domains", add your domain: ${currentDomain}

Additional domains to add if needed:
- Your Replit domain (if applicable)
- luxethread.ie
- www.luxethread.ie
  `);
}

export { app, auth, db, googleProvider };
