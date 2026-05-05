import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZANahlxMfDla08ebxZlc4X1CqhoY4fGE",
  authDomain: "reion-ai.firebaseapp.com",
  projectId: "reion-ai",
  storageBucket: "reion-ai.firebasestorage.app",
  messagingSenderId: "468439601245",
  appId: "1:468439601245:web:fb36c5349b3b28787cbdb4",
  measurementId: "G-KCVT0K6C96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
