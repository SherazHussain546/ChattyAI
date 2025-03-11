
# Chat Application with Talking Avatar (Ionic Version)

This document contains all the terminal commands needed to set up, run, and deploy this Ionic chat application with a talking avatar.

## Initial Setup

```bash
# Clone the repository or start with the existing Repl
# Install dependencies
npm install
```

## Development Commands

```bash
# Start the development server (both backend and frontend)
npm run dev

# Start only the Ionic frontend
npm run ionic:serve

# Check TypeScript types
npm run check
```

## Building for Production

```bash
# Build the application (frontend and backend)
npm run build

# Build only the Ionic frontend
npm run ionic:build

# Start the production server
npm run start
```

## Mobile Platform Setup (For Local Development Outside Replit)

```bash
# Add mobile platforms
npm run ionic:cap:add

# Sync the web code to the native platforms
npm run ionic:cap:sync

# Open Android Studio
npx cap open android

# Open Xcode
npx cap open ios
```

## Database Setup

```bash
# Initialize and push the database schema
npm run db:push
```

## Deployment on Replit

The deployment is already configured in the `.replit` file. To deploy manually, use the Replit Deployments tab or the following commands:

```bash
# Build the application
npm run build

# Deploy the application
# No command needed - use the Deployments tab in Replit UI
```

## Common Development Tasks

```bash
# Install a new package
npm install package-name

# Install a development dependency
npm install --save-dev package-name

# Update dependencies
npm update

# Restart the development server
# Press Ctrl+C to stop the current server, then:
npm run dev
```
