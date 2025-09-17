// Firebase imports from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIBaheScEGv-5j8EV-xccCr6m0V9MmkpA",
  authDomain: "rampurhat-one.firebaseapp.com",
  projectId: "rampurhat-one",
  storageBucket: "rampurhat-one.firebasestorage.app",
  messagingSenderId: "648860882666",
  appId: "1:648860882666:web:d24b3ebc6f67a5f6bc2993",
  measurementId: "G-F5TJGPF9F3"
};

// Initialize Firebase and Analytics
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Auth setup
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign-in function
async function signIn() {
  try {
    await signInWithPopup(auth, provider);
    alert("Signed in successfully!");
  } catch (error) {
    alert("Sign-in failed: " + error.message);
  }
}

// Attach sign-in event after page load
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("signin");
  if (btn) btn.addEventListener("click", signIn);
});
