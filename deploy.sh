#!/bin/bash

# ChattyAI Deployment Script
# This script helps deploy the application to Firebase Hosting
# and connects it to your custom domain (luxethread.ie)

echo "🚀 Starting ChattyAI deployment process..."

# Step 1: Build the frontend application
echo "📦 Building the frontend application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed. Aborting deployment."
  exit 1
fi

echo "✅ Frontend build successful!"

# Step 2: Deploy Firebase Security Rules
echo "🔒 Deploying Firestore and Storage security rules..."
firebase deploy --only firestore:rules,storage:rules

# Step 3: Deploy Firebase Functions (if you have any)
echo "⚙️ Deploying Firebase Functions..."
firebase deploy --only functions

# Step 4: Deploy the application to Firebase Hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

# Step 5: Verify custom domain setup
echo "🔍 Checking custom domain status..."
echo "Please make sure you've added your custom domain (luxethread.ie) in the Firebase console:"
echo "1. Go to Firebase Console > Hosting > Add custom domain"
echo "2. Follow the instructions to set up DNS records for 'luxethread.ie'"
echo "3. Make sure to also add 'luxethread.ie' to your Firebase Authentication authorized domains"

echo "✨ Deployment complete! Your app should now be live at:"
echo "🌎 https://luxethread.ie"
echo "🌎 https://your-project-id.web.app"

echo "For any issues with the custom domain, please check the Firebase Hosting documentation:"
echo "https://firebase.google.com/docs/hosting/custom-domain"