# ChattyAI - Netlify Deployment Guide

Your ChattyAI app has been converted to work with Netlify! Here's how to deploy it:

## Quick Deployment Steps

### 1. Connect to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up or log in
3. Click "New site from Git"
4. Connect your GitHub/GitLab repository
5. Select this repository

### 2. Configure Build Settings
Netlify should auto-detect the settings from `netlify.toml`, but verify:
- **Build command**: `vite build`
- **Publish directory**: `dist/public`
- **Functions directory**: `netlify/functions`

### 3. Set Environment Variables
In your Netlify dashboard, go to Site settings > Environment variables and add:

#### Firebase Configuration
```
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

#### AI Configuration
```
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Deploy
Click "Deploy site" and Netlify will build and deploy your app!

## What Changed for Netlify

✅ **Netlify Functions**: Express routes converted to serverless functions
✅ **Static Build**: Frontend builds to static files
✅ **API Redirects**: `/api/*` routes redirect to Netlify Functions
✅ **Environment Variables**: Configured for Netlify's system
✅ **CORS Handling**: Added CORS headers to all functions

## File Structure for Netlify

```
your-app/
├── netlify.toml                 # Netlify configuration
├── netlify/
│   └── functions/              # Serverless functions
│       ├── messages.ts         # Chat API
│       ├── messages-clear.ts   # Clear chat
│       ├── firebase-auth.ts    # Authentication
│       ├── chat-sessions.ts    # Chat sessions
│       └── preferences.ts      # User preferences
├── client/                     # Frontend code
└── dist/public/               # Built static files
```

## Firebase Domain Authorization

After deployment, you'll need to authorize your Netlify domain in Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication > Settings
4. Add your Netlify domain to "Authorized domains"
   - Example: `your-app-name.netlify.app`

## Troubleshooting

### API Not Working
- Check environment variables are set correctly
- Verify Netlify Functions are deploying (check Functions tab)
- Check browser network tab for CORS errors

### Firebase Auth Issues
- Ensure VITE_ prefixed variables are set
- Verify Firebase domain authorization
- Check Firebase project settings

### AI Responses Not Working
- Verify GEMINI_API_KEY is set
- Check Gemini API quota and billing
- Monitor function logs in Netlify dashboard

Your ChattyAI app is now ready for Netlify deployment! 🚀