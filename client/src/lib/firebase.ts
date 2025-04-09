
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
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
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
  const isLuxeThread = currentDomain.includes('luxethread.ie');
  
  // Create an improved, more specific message based on the domain
  const message = `
📋 Firebase Authentication Domain Setup Instructions 📋

${isLuxeThread 
    ? '🔒 IMPORTANT: luxethread.ie Domain Setup Required 🔒'  
    : '🔒 Domain Authorization Required 🔒'
}

To fix the unauthorized domain error:

1. Go to Firebase Console (https://console.firebase.google.com)
2. Select your project: "${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your project'}"
3. Go to "Authentication" section in the left sidebar
4. Click on the "Settings" tab
5. Scroll down to "Authorized domains" section
6. Click "Add domain" and add: ${currentDomain}

${isLuxeThread 
    ? `For luxethread.ie, also add these additional domains:
   - www.luxethread.ie
   - app.luxethread.ie (if you plan to use this subdomain)` 
    : `If using multiple environments, also consider adding:
   - Your Replit domain (if applicable)
   - Your production domain (if different from current)`
}

After adding the domain(s), return to this page and try Google Sign-in again.

Need more help? Visit: https://firebase.google.com/docs/auth/web/google-signin
`;

  alert(message);
}

export { app, auth, db, googleProvider };
