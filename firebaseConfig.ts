// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAbnTm4O4BHzz42y_z18XZwBIw-Y6-WWo",
  authDomain: "scrappr-a2f39.firebaseapp.com",
  projectId: "scrappr-a2f39",
  storageBucket: "scrappr-a2f39.firebasestorage.app",
  messagingSenderId: "1075565266262",
  appId: "1:1075565266262:web:f1ae846eea613bcf8982f7",
  measurementId: "G-NL6N2C1221"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, "us-central1");
export { app, auth, db, functions };

