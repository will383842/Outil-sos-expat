# Outil SOS Expat - AI Assistant

AI-powered assistant tool for SOS Expat service providers. Separate Firebase project providing intelligent support and automation for providers.

## Overview

The AI Assistant is a React-based web application that helps SOS Expat providers manage their activities, respond to clients, and access knowledge base resources. It uses Firebase for backend services and AI capabilities.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Headless UI
- **Backend**: Firebase (separate project)
  - Authentication
  - Firestore Database
  - Cloud Functions
  - Cloud Storage
- **AI**: Integration with AI services for provider assistance

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project credentials

### Installation

```bash
# Install dependencies
npm install

# Configure Firebase
# Add your Firebase config to .env or firebase configuration
cp .env.example .env

# Start development server
npm run dev
```

### Development

```bash
# Dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## Firebase Configuration

This project uses a separate Firebase project from the main SOS Expat app.

### Setup

1. Create Firebase project in Google Cloud Console
2. Enable required services:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Functions
   - Cloud Storage
3. Download service account credentials
4. Configure `.env` with Firebase credentials

### Deploy Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### Deploy Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

```
Outil-sos-expat/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and Firebase config
│   ├── pages/          # Page components
│   └── types/          # TypeScript types
├── functions/          # Firebase Cloud Functions
│   └── src/
├── public/             # Static assets
└── firebase.json       # Firebase configuration
```

## Features

- **AI Chat Assistant**: Real-time chat interface with AI support
- **Knowledge Base**: Access to provider documentation and resources
- **Activity Tracking**: Monitor provider activities and metrics
- **Smart Suggestions**: AI-powered recommendations for providers
- **Multi-language**: Support for multiple languages

## Deployment

### Hosting Deployment

Application is deployed via Firebase Hosting:

```bash
# Build and deploy
npm run build
firebase deploy --only hosting
```

### Functions Deployment

```bash
cd functions
rm -rf lib
npm run build
firebase deploy --only functions
```

## Quotas and Limits

Monitor usage in Firebase Console:
- **Firestore**: Document reads/writes
- **Cloud Functions**: Invocations and compute time
- **Storage**: File storage and bandwidth
- **Authentication**: Active users

Check quotas regularly to avoid service interruptions.

## Environment Variables

Required `.env` variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Development Notes

- Separate Firebase project (NOT main SOS Expat project)
- Uses Vite for fast development and optimized builds
- TypeScript for type safety
- Tailwind CSS for styling
- Firebase Authentication for provider access control

## Troubleshooting

### Common Issues

1. **Firebase debug logs**: Delete `firebase-debug.log` files (generated during errors)
2. **Build errors**: Clear `node_modules` and reinstall
3. **Type errors**: Run `npm run type-check` to identify issues

## Support

For issues specific to the AI Assistant tool, check:
- Firebase Console for service status
- Function logs for backend errors
- Browser console for frontend errors

## Related Projects

- **Main SOS Expat App**: `../sos/`
- **Multi-Provider Dashboard**: `../Dashboard-multiprestataire/`

## License

Proprietary - All rights reserved
