import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } 
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

// Current user
let currentUser = null;

// Sign-in
function signIn() {
  signInWithPopup(auth, provider)
    .then(result => {
      currentUser = result.user;
      document.getElementById("userStatus").innerText = "Signed in as " + (currentUser.displayName || currentUser.email);
      loadItems();
    })
    .catch(err => {
      console.error("Sign-in popup error:", err);
      alert("Sign-in failed: " + err.message);
    });
}

// Post Item
async function postItem(title, price) {
  if (!currentUser) {
    alert("Sign in first!");
    return;
  }
  if (!title || !price) {
    alert("Enter both title and price");
    return;
  }
  await addDoc(collection(db, "items"), {
    title,
    price,
    uid: currentUser.uid,
    timestamp: Date.now(),
    sold: false
  });
  document.getElementById("itemTitle").value = "";
  document.getElementById("itemPrice").value = "";
  loadItems();
}

// Buy Item
async function buyItem(docId) {
  await updateDoc(doc(db, "items", docId), { sold: true });
  loadItems();
}

// Delete Item
async function deleteItem(docId) {
  await deleteDoc(doc(db, "items", docId));
  loadItems();
}

// Edit Item
async function editItem(docId, currentTitle, currentPrice) {
  const newTitle = prompt("Edit title:", currentTitle);
  if (newTitle === null) return;
  const newPrice = prompt("Edit price:", currentPrice);
  if (newPrice === null) return;
  await updateDoc(doc(db, "items", docId), { title: newTitle, price: parseFloat(newPrice) });
  loadItems();
}

// Load Items
async function loadItems(sort = "none") {
  const itemsList = document.getElementById("itemsList");
  itemsList.innerHTML = "";

  let q;
  if (sort === "low") q = query(collection(db, "items"), orderBy("price", "asc"));
  else if (sort === "high") q = query(collection(db, "items"), orderBy("price", "desc"));
  else q = collection(db, "items");

  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "itemCard" + (data.sold ? " sold" : "");
    div.innerHTML = `
      <strong>${data.title}</strong>
      <div class="itemPrice">₹${data.price}</div>
    `;

    if (!data.sold) {
      const buyBtn = document.createElement("button");
      buyBtn.className = "btn";
      buyBtn.textContent = "Buy Now";
      buyBtn.onclick = () => buyItem(docSnap.id);
      div.appendChild(buyBtn);
    } else {
      const soldLabel = document.createElement("span");
      soldLabel.textContent = "SOLD";
      soldLabel.style.color = "red";
      div.appendChild(soldLabel);
    }

    if (currentUser && currentUser.uid === data.uid) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => editItem(docSnap.id, data.title, data.price);
      div.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => deleteItem(docSnap.id);
      div.appendChild(deleteBtn);
    }

    itemsList.appendChild(div);
  });
}

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("signin").addEventListener("click", signIn);
  document.getElementById("postItemBtn").addEventListener("click", () => {
    const title = document.getElementById("itemTitle").value;
    const price = parseFloat(document.getElementById("itemPrice").value);
    postItem(title, price);
  });
  document.getElementById("sortPrice").addEventListener("change", (e) => {
    loadItems(e.target.value);
  });
});
