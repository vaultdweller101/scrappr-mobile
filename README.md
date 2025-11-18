# Scrappr Mobile

Scrappr Mobile is a React Native application built with Expo that serves as a mobile client for capturing quick ideas and notes. It syncs in real-time with a Firebase Firestore backend.

## Features

* **Real-time Sync:** Notes saved on the mobile app instantly appear in the Firestore database.
* **Offline Support:** Built-in Firestore persistence allows usage in spotty network conditions.
* **Cross-Platform:** Runs on both Android and iOS.
* **Dark Mode Support:** Adapts to the user's system theme preferences.

## Tech Stack

* **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
* **Language:** TypeScript
* **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/)
* **Backend:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
* **UI Components:** Custom themed components (`ThemedText`, `ThemedView`)

## Getting Started

### 1. Prerequisites

* Node.js (LTS version recommended)
* Expo Go app on your mobile device OR Android Studio/Xcode for emulators.

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Firebase Configuration

This project requires a Firebase project to function.

1.  Create a project in the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Project Settings** \> **General** \> **Your apps** and create a new **Web App**.
3.  Copy the `firebaseConfig` object provided by Firebase.
4.  Open `firebaseConfig.ts` in your project and replace the configuration object:

```typescript
// firebaseConfig.ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Running the App

Start the development server:

```bash
npx expo start
```

  * **Press `a`** to run on Android Emulator.
  * **Press `i`** to run on iOS Simulator (Mac only).
  * **Scan the QR code** with the Expo Go app to run on a physical device.

## Project Structure

  * **app/**: Contains the Expo Router file-based navigation.
      * `(tabs)/index.tsx`: The main Home screen displaying the list of notes.
      * `modal.tsx`: The "New Idea" modal for creating notes.
  * **components/**: Reusable UI components (`ThemedText`, `ThemedView`, `Collapsible`).
  * **constants/**: App-wide constants like Colors and Themes.
  * **hooks/**: Custom hooks for theme colors and color schemes.
