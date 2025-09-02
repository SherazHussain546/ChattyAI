# ChattyAI - AI-Powered Chat Application

## Overview

ChattyAI is an advanced conversational AI application that combines multiple technologies to create an immersive chat experience. The application features Google Gemini AI integration, Firebase authentication and data storage, real-time screen sharing analysis, voice interaction capabilities, and a 3D avatar interface. Built as a full-stack web application with mobile support through Ionic/Capacitor, it provides users with intelligent, context-aware conversations enhanced by multimedia interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development practices
- **UI Framework**: Hybrid approach using both traditional React components and Ionic for mobile-optimized interfaces
- **Styling**: TailwindCSS with Radix UI components for consistent design system
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Primary Server**: Node.js/Express with TypeScript for API endpoints
- **Alternative Backend**: FastAPI (Python) implementation available for AI processing
- **API Design**: RESTful endpoints with real-time capabilities through Server-Sent Events (SSE)
- **Authentication**: Passport.js integration with Firebase Auth for secure user management
- **Database Integration**: Drizzle ORM configured for PostgreSQL with migration support

### Data Storage Solutions
- **Primary Database**: Firebase Firestore for real-time chat data, user profiles, and session management
- **Secondary Database**: PostgreSQL support through Drizzle ORM for structured data needs
- **Storage Strategy**: Hybrid approach allowing both NoSQL (Firestore) and SQL (PostgreSQL) based on use case
- **Data Models**: Comprehensive schema definitions covering users, chat messages, preferences, and chat sessions

### Authentication and Authorization
- **Authentication Provider**: Firebase Authentication supporting Google OAuth and anonymous users
- **Session Management**: Express session handling with memory store for development and scalable options for production
- **Authorization Flow**: JWT token verification through Firebase Admin SDK
- **User Management**: Automatic user creation and profile management with Firebase UID linking

### AI Integration
- **Primary AI**: Google Gemini API for text generation and multimodal capabilities
- **Model Selection**: Dynamic model selection with fallback options (Gemini 1.5 Pro/Flash variants)
- **Streaming Support**: Server-Sent Events implementation for real-time AI response streaming
- **Vision Capabilities**: Image analysis and screen sharing integration for context-aware responses
- **Safety Controls**: Configurable harm category filtering and content moderation

### Real-time Features
- **Voice Integration**: Web Speech API for speech recognition and synthesis
- **Screen Sharing**: MediaDevices API for screen capture and analysis
- **3D Avatar**: Three.js implementation for animated avatar responses
- **Live Updates**: Real-time message synchronization through Firebase listeners

### Mobile Support
- **Framework**: Ionic/Capacitor for native mobile app deployment
- **Platform Targets**: Android and iOS support with web fallback
- **PWA Features**: Progressive Web App capabilities for offline functionality
- **Responsive Design**: Mobile-first design approach with touch-optimized interfaces

### Development and Deployment
- **Development Server**: Concurrent frontend and backend development with hot reloading
- **Build Pipeline**: Separate build processes for client and server with production optimization
- **Environment Configuration**: Comprehensive environment variable management for different deployment targets
- **Hosting Strategy**: Firebase Hosting for frontend with Cloud Functions or external server for backend APIs

## External Dependencies

### Firebase Services
- **Firebase Authentication**: User management and OAuth integration
- **Firebase Firestore**: Real-time NoSQL database for chat data
- **Firebase Hosting**: Static site hosting and CDN
- **Firebase Admin SDK**: Server-side Firebase operations and token verification

### AI and Machine Learning
- **Google Gemini API**: Primary AI service for text generation and vision capabilities
- **Google Generative AI SDK**: Official client library for Gemini integration

### Database and ORM
- **Drizzle ORM**: Type-safe database operations and schema management
- **Neon Database**: Serverless PostgreSQL provider for structured data needs
- **PostgreSQL**: Relational database for complex data relationships

### UI and Component Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **TailwindCSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **Three.js**: 3D graphics library for avatar rendering

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: JavaScript bundler for production builds
- **TSX**: TypeScript execution for development workflows

### Mobile and Cross-Platform
- **Ionic Framework**: Mobile UI components and native device access
- **Capacitor**: Native runtime for mobile app deployment
- **PWA Elements**: Progressive Web App utilities and service workers

### Real-time and Communication
- **Server-Sent Events**: Real-time streaming for AI responses
- **Web Speech API**: Browser-native speech recognition and synthesis
- **MediaDevices API**: Screen sharing and camera access for enhanced interactions