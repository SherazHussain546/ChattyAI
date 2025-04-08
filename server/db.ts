import { db, isFirebaseConfigured } from './firebase';

// Test Firebase connection 
async function testConnection() {
  try {
    if (!isFirebaseConfigured()) {
      console.warn('Firebase configuration is incomplete. Please check your environment variables.');
      return false;
    }
    
    console.log('Firebase configured successfully');
    return true;
  } catch (err) {
    console.error('Firebase connection error:', err);
    return false;
  }
}

// Export the Firestore db instance
export { db };

// Test the connection
testConnection();