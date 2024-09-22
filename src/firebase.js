// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeccU9TKC_S_5d_xpWhoSoPvxjzJjc72w",
  authDomain: "seminar-66761.firebaseapp.com",
  projectId: "seminar-66761",
  storageBucket: "seminar-66761.appspot.com",
  messagingSenderId: "790773345868",
  appId: "1:790773345868:web:169de94eb7f9ed2fca4ee9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase Authentication and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
