import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } 
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } 
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Config
const firebaseConfig = {
  apiKey: "AIzaSyAIBaheScEGv-5j8EV-xccCr6m0V9MmkpA",
  authDomain: "rampurhat-one.firebaseapp.com",
  projectId: "rampurhat-one",
  storageBucket: "rampurhat-one.firebasestorage.app",
  messagingSenderId: "648860882666",
  appId: "1:648860882666:web:d24b3ebc6f67a5f6bc2993",
  measurementId: "G-F5TJGPF9F3"
};
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

let currentUser = null;
let itemsCache = [];

// Modal handling
const modalBg = document.getElementById("modalBg");
const modalText = document.getElementById("modalText");
const modalConfirm = document.getElementById("modalConfirm");
const modalCancel = document.getElementById("modalCancel");
let modalCallback = null;

function showModal(text, callback) {
  modalText.textContent = text;
  modalBg.style.display = "flex";
  modalCallback = callback;
}
modalConfirm.onclick = () => { modalBg.style.display = "none"; if (modalCallback) modalCallback(true); };
modalCancel.onclick = () => { modalBg.style.display = "none"; if (modalCallback) modalCallback(false); };

// Sign-in
document.getElementById("signin").addEventListener("click", () => {
  if (currentUser) {
    showModal("Sign out?", (ok) => { if(ok) signOut(auth); });
  } else {
    signInWithRedirect(auth, provider);
  }
});
getRedirectResult(auth).then((result) => {
  if (result.user) {
    currentUser = result.user;
    document.getElementById("userStatus").innerText = "Signed in as " + currentUser.displayName;
    loadItems();
  }
}).catch(err => console.error(err));

auth.onAuthStateChanged(user => {
  currentUser = user;
  document.getElementById("userStatus").innerText = user ? "Signed in as " + user.displayName : "Not signed in";
  loadItems();
});

// Post item
document.getElementById("postItemBtn").addEventListener("click", async () => {
  const title = document.getElementById("itemTitle").value.trim();
  const price = parseFloat(document.getElementById("itemPrice").value);
  if (!currentUser) return alert("Sign in first!");
  if (!title || isNaN(price)) return alert("Enter valid title and price");
  await addDoc(collection(db, "items"), { title, price, uid: currentUser.uid, sold:false, timestamp:Date.now() });
  document.getElementById("itemTitle").value = "";
  document.getElementById("itemPrice").value = "";
  loadItems();
});

// Sorting
document.getElementById("sortSelect").addEventListener("change", () => renderItems());

// Load items
async function loadItems() {
  const snapshot = await getDocs(collection(db, "items"));
  itemsCache = [];
  snapshot.forEach(docSnap => {
    itemsCache.push({id:docSnap.id, ...docSnap.data()});
  });
  renderItems();
}

function renderItems() {
  const sort = document.getElementById("sortSelect").value;
  let items = [...itemsCache];
  if (sort === "asc") items.sort((a,b)=>a.price-b.price);
  if (sort === "desc") items.sort((a,b)=>b.price-a.price);

  const list = document.getElementById("itemsList");
  list.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "itemCard" + (item.sold ? " sold" : "");
    div.innerHTML = `
      <strong>${item.title}</strong><br>₹${item.price}
      <div class="actions">
        ${!item.sold ? `<button class="btn buyBtn">Buy Now</button>` : `<span>SOLD</span>`}
        ${currentUser && currentUser.uid === item.uid ? `
          <button class="btn editBtn">Edit</button>
          <button class="btn delBtn">Delete</button>` : ""}
      </div>`;
    // Buy Now
    div.querySelector(".buyBtn")?.addEventListener("click", () => {
      const upiUrl = `upi://pay?pa=soumodityapramanik-1@okicici&pn=Rampurhat%20One&am=${item.price}&cu=INR`;
      window.location.href = upiUrl;
      showModal("After completing payment in your UPI app, mark as paid?", async(ok)=>{
        if(ok){ await updateDoc(doc(db,"items",item.id),{sold:true}); loadItems(); }
      });
    });
    // Edit
    div.querySelector(".editBtn")?.addEventListener("click", () => {
      const newTitle = prompt("Edit title:", item.title);
      const newPrice = parseFloat(prompt("Edit price:", item.price));
      if(newTitle && !isNaN(newPrice)){
        updateDoc(doc(db,"items",item.id),{title:newTitle,price:newPrice}).then(loadItems);
      }
    });
    // Delete
    div.querySelector(".delBtn")?.addEventListener("click", () => {
      showModal("Delete this item?", async(ok)=>{ if(ok){ await deleteDoc(doc(db,"items",item.id)); loadItems(); }});
    });
    list.appendChild(div);
  });
    }
