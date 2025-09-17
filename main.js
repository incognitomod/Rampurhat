// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAIBaheScEGv-5j8EV-xccCr6m0V9MmkpA",
  authDomain: "rampurhat-one.firebaseapp.com",
  projectId: "rampurhat-one",
  storageBucket: "rampurhat-one.firebasestorage.app",
  messagingSenderId: "648860882666",
  appId: "1:648860882666:web:d24b3ebc6f67a5f6bc2993",
  measurementId: "G-F5TJGPF9F3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Sign-in using popup (avoids missing initial state error)
function signIn() {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      document.getElementById("userStatus").innerText = "Signed in as " + (user.displayName || user.email);
      loadItems(); // load items after sign-in
    })
    .catch(err => {
      console.error("Sign-in popup error:", err);
      alert("Sign-in failed: " + err.message);
    });
}

// Post an item
async function postItem(title, price) {
  if (!auth.currentUser) {
    alert("Sign in first!");
    return;
  }
  if (!title || !price) {
    alert("Enter both title and price");
    return;
  }
  try {
    await addDoc(collection(db, "items"), {
      title,
      price,
      uid: auth.currentUser.uid,
      timestamp: Date.now()
    });
    document.getElementById("itemTitle").value = "";
    document.getElementById("itemPrice").value = "";
    loadItems();
  } catch(err) {
    alert("Error posting: " + err.message);
  }
}

// Load and display items
async function loadItems() {
  const itemsList = document.getElementById("itemsList");
  itemsList.innerHTML = "";
  try {
    const querySnapshot = await getDocs(collection(db, "items"));
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "itemCard";
      div.innerHTML = `
        <strong>${data.title}</strong>
        <div class="itemPrice">₹${data.price}</div>
      `;
      itemsList.appendChild(div);
    });
  } catch(err) {
    console.error("Error loading items:", err);
  }
}

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("signin").addEventListener("click", signIn);
  document.getElementById("postItemBtn").addEventListener("click", () => {
    const title = document.getElementById("itemTitle").value;
    const price = parseFloat(document.getElementById("itemPrice").value);
    postItem(title, price);
  });
  loadItems(); // load items on page load if already signed in
});
