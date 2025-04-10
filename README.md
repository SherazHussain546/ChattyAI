# ChattyAI - AI-Powered Chat Application

ChattyAI is an advanced conversational AI application powered by Google's Gemini AI. It features real-time screen analysis, voice interaction, and intelligent context-aware responses.

## Features

- **Firebase Authentication**: Sign in with Google or continue as guest
- **Chat History**: All conversations are stored securely in Firebase Firestore
- **AI-Powered Conversations**: Utilizes Google's Gemini AI for natural language understanding
- **Screen Sharing Analysis**: Share your screen for AI to provide context-aware assistance
- **Voice Interaction**: Talk with the AI using speech recognition and synthesis
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Toggle between dark and light themes

## Tech Stack

- **Frontend**: React.js with TailwindCSS
- **Backend**: Node.js/Express
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **AI**: Google Gemini API
- **Hosting**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn
- Firebase account
- Google Cloud Platform account (for Gemini API)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id

# Also needed for frontend
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Session Secret
SESSION_SECRET=your_session_secret
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SherazHussain546/ChattyAIProject.git
   cd ChattyAIProject
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5000`

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   
   - Select Hosting
   - Select your Firebase project
   - Set public directory to `client/dist`
   - Configure as a single-page app
   - Set up GitHub Action deploys if needed

4. Build the application:
   ```bash
   npm run build
   ```

5. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

### Custom Domain Setup (luxethread.ie)

1. Go to the Firebase console and select your project
2. Navigate to Hosting in the left sidebar
3. Click "Add custom domain"
4. Enter your domain: `luxethread.ie`
5. Follow the DNS verification and configuration steps
6. Set up your DNS records as instructed by Firebase
7. Wait for DNS propagation (can take up to 48 hours)

**Important**: Make sure to add your custom domain (`luxethread.ie`) to the authorized domains list in Firebase Authentication settings.

## Firebase Security Rules

### Firestore Rules

Create a file named `firestore.rules` with the following content:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Common function to check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if the user is accessing their own data
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Guest users have a specific prefix in their ID
    function isGuestUser() {
      return isAuthenticated() && request.auth.token.firebase.sign_in_provider == 'anonymous';
    }
    
    // Users can read and update their own profile
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || resource.data.isPublic == true);
      allow create: if isAuthenticated();
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Chat messages - users can only access their own chats
    match /chats/{chatId} {
      allow read, create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
      
      // Chat messages within a chat
      match /messages/{messageId} {
        allow read: if isAuthenticated() && get(/databases/$(database)/documents/chats/$(chatId)).data.userId == request.auth.uid;
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
      }
    }
    
    // User preferences
    match /preferences/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Public data that anyone can read
    match /public/{document=**} {
      allow read: if true;
      allow write: if isAuthenticated() && !isGuestUser();  // Only registered users can write to public data
    }
  }
}
```

### Storage Rules

Create a file named `storage.rules` with the following content:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Common function to check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if the user is accessing their own data
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Check if the file is within size limits
    function isValidSize() {
      return request.resource.size < 5 * 1024 * 1024; // 5MB
    }
    
    // Check if the content type is an image
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Check if the content type is allowed (images, documents, etc.)
    function isAllowedType() {
      return request.resource.contentType.matches('image/.*') || 
             request.resource.contentType.matches('application/pdf') ||
             request.resource.contentType.matches('text/plain');
    }
    
    // User profile images
    match /users/{userId}/profile/{fileName} {
      allow read: if true;  // Everyone can see profile pictures
      allow write: if isOwner(userId) && isImage() && isValidSize();
    }
    
    // User uploaded images for chats
    match /users/{userId}/uploads/{fileName} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isAllowedType() && isValidSize();
    }
    
    // Shared files (visible to all users)
    match /shared/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAllowedType() && isValidSize() && 
                    !request.auth.token.firebase.sign_in_provider == 'anonymous'; // Only registered users
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Project Structure

```
/
├── client/               # Frontend code
│   ├── src/              # React source files
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   ├── App.tsx       # Main React component
│   │   └── main.tsx      # Entry point
│   └── index.html        # HTML template
├── server/               # Backend code
│   ├── auth.ts           # Authentication logic
│   ├── db.ts             # Database connections
│   ├── firebase.ts       # Firebase configuration
│   ├── gemini.ts         # Gemini AI integration
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage.ts        # Storage interfaces
├── shared/               # Shared code
│   └── schema.ts         # Data schemas
├── .env                  # Environment variables
└── package.json          # Dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Sheraz Hussain - [sheraz.ie21@gmail.com](mailto:sheraz.ie21@gmail.com)
Project Link: [https://github.com/SherazHussain546/ChattyAIProject](https://github.com/SherazHussain546/ChattyAIProject)