import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const userStatus = document.getElementById("userStatus");
const darkToggle = document.getElementById("darkToggle");

// Dark mode
darkToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// Auth state listener
onAuthStateChanged(auth, user => {
  if (user) {
    userStatus && (userStatus.innerText = `Signed in as ${user.displayName || user.email}`);
  } else {
    userStatus && (userStatus.innerText = "Not signed in");
  }
});

// Google Sign-in
document.getElementById("googleSignInBtn")?.addEventListener("click", async () => {
  const role = document.getElementById("roleSelect")?.value || "customer";
  const result = await signInWithPopup(auth, provider);
  await addUserRole(result.user.uid, role);
});

// Email Sign-up
document.getElementById("emailSignUpBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  const role = document.getElementById("roleSelect")?.value || "customer";
  const userCred = await createUserWithEmailAndPassword(auth, email, pass);
  await addUserRole(userCred.user.uid, role);
});

// Email Sign-in
document.getElementById("emailSignInBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  await signInWithEmailAndPassword(auth, email, pass);
});

// Sign-out
document.getElementById("signOutBtn")?.addEventListener("click", () => signOut(auth));

// Add role to Firestore
async function addUserRole(uid, role) {
  const docRef = collection(db, "users");
  const q = query(docRef);
  const snapshot = await getDocs(q);
  const exists = snapshot.docs.find(d => d.id === uid);
  if (!exists) {
    await addDoc(docRef, { uid, role, darkMode: false, lang: "en" });
  }
}

// Post Item (Merchant)
document.getElementById("postItemBtn")?.addEventListener("click", async () => {
  const title = document.getElementById("itemTitle").value;
  const price = parseFloat(document.getElementById("itemPrice").value);
  const imageURL = document.getElementById("itemImage").value;
  if (!auth.currentUser) { alert("Sign in first!"); return; }
  await addDoc(collection(db, "items"), { title, price, imageURL, uid: auth.currentUser.uid, sold: false, createdAt: Date.now() });
  alert("Item posted!");
});

// Load Items
async function loadItems(sort = "none") {
  const list = document.getElementById("itemsList");
  if (!list) return;
  list.innerHTML = "";
  let q = collection(db, "items");
  if (sort === "low") q = query(q, orderBy("price", "asc"));
  if (sort === "high") q = query(q, orderBy("price", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<strong>${data.title}</strong><br>₹${data.price}<br>
    <button onclick="buyUPI('${data.price}','${data.title}')">Buy Now</button>`;
    list.appendChild(div);
  });
}

// Buy via UPI
window.buyUPI = (amount, title) => {
  const upiId = "soumodityapramanik-1@okicici";
  const url = `upi://pay?pa=${upiId}&pn=RampurhatOne&am=${amount}&cu=INR&tn=${encodeURIComponent(title)}`;
  window.open(url, "_blank");
};

// Sort select listener
document.getElementById("sortSelect")?.addEventListener("change", (e) => loadItems(e.target.value));

// Initial load
loadItems();
