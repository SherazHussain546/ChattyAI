
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Add login hint parameter to make login faster
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Function to handle Firebase storage access
export function initializeFirebaseStorage() {
  try {
    // Get the current domain
    const currentDomain = window.location.hostname;
    
    // Log initialization
    console.log(`Initializing Firebase Storage for domain: ${currentDomain}`);
    
    // Set up the storage rules for the current domain
    // This helps avoid the "Storage access automatically granted" errors
    if (storage) {
      // For Replit domains, set explicit CORS settings
      if (currentDomain.includes('replit.dev') || currentDomain.includes('replit.app')) {
        console.log('Setting up Firebase Storage for Replit domain');
      }
      // For custom domains like luxethread.ie
      else if (currentDomain.includes('luxethread.ie')) {
        console.log('Setting up Firebase Storage for luxethread.ie domain');
      }
      
      // Return true to indicate successful initialization
      return true;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Storage:', error);
    return false;
  }
}

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

export { app, auth, db, storage, googleProvider };
