// FULL main.js - replace your file with this exact content

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* =========================
   CONFIG - update if needed
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAIBaheScEGv-5j8EV-xccCr6m0V9MmkpA",
  authDomain: "rampurhat-one.firebaseapp.com",
  projectId: "rampurhat-one",
  storageBucket: "rampurhat-one.firebasestorage.app",
  messagingSenderId: "648860882666",
  appId: "1:648860882666:web:d24b3ebc6f67a5f6bc2993",
  measurementId: "G-F5TJGPF9F3"
};

// Initialize
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/* =========================
   UI refs
   ========================= */
const userStatusEl = document.getElementById('userStatus');
const userEmailEl = document.getElementById('userEmail');
const signinBtn = document.getElementById('signin');
const signoutBtn = document.getElementById('signout');
const postItemBtn = document.getElementById('postItemBtn');
const itemTitleEl = document.getElementById('itemTitle');
const itemPriceEl = document.getElementById('itemPrice');
const itemsListEl = document.getElementById('itemsList');
const sortEl = document.getElementById('sortPrice');

let currentUser = null;
let currentSort = 'none';

/* =========================
   AUTH
   ========================= */
signinBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(err => {
    console.error('Sign-in popup error:', err);
    alert('Sign-in failed: ' + (err.message || err));
  });
});

signoutBtn.addEventListener('click', () => {
  signOut(auth).catch(err => {
    console.error('Sign-out error:', err);
    alert('Sign-out failed: ' + (err.message || err));
  });
});

// Keep currentUser in sync and refresh UI
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    userStatusEl.textContent = `Signed in as ${user.displayName || user.email}`;
    userEmailEl.textContent = user.email || '';
    signinBtn.style.display = 'none';
    signoutBtn.style.display = 'inline-block';
  } else {
    userStatusEl.textContent = 'Not signed in';
    userEmailEl.textContent = '';
    signinBtn.style.display = 'inline-block';
    signoutBtn.style.display = 'none';
  }
  // reload items so owner buttons appear correctly
  loadItems(currentSort).catch(err => console.error(err));
});

/* =========================
   POST ITEM
   ========================= */
postItemBtn.addEventListener('click', async () => {
  const title = (itemTitleEl.value || '').trim();
  const rawPrice = itemPriceEl.value;
  const price = Number(rawPrice);

  if (!currentUser) {
    alert('Sign in first to post an item.');
    return;
  }
  if (!title) {
    alert('Enter item title.');
    return;
  }
  if (!Number.isFinite(price) || isNaN(price)) {
    alert('Enter a valid numeric price.');
    return;
  }
  if (price < 0) {
    alert('Price must be 0 or greater.');
    return;
  }

  try {
    await addDoc(collection(db, 'items'), {
      title,
      price,
      uid: currentUser.uid,
      ownerName: currentUser.displayName || currentUser.email || null,
      timestamp: Date.now(),
      sold: false
    });
    itemTitleEl.value = '';
    itemPriceEl.value = '';
    await loadItems(currentSort);
  } catch (err) {
    console.error('Error posting item:', err);
    alert('Failed to post item: ' + (err.message || err));
  }
});

/* =========================
   LOAD + RENDER ITEMS (client-side sort)
   ========================= */
async function loadItems(sort = 'none') {
  itemsListEl.innerHTML = ''; // clear
  currentSort = sort;

  try {
    const colRef = collection(db, 'items');
    const snap = await getDocs(colRef);
    const items = [];
    snap.forEach(snapDoc => {
      const d = snapDoc.data() || {};
      // normalize
      const price = Number.isFinite(Number(d.price)) ? Number(d.price) : 0;
      items.push({
        id: snapDoc.id,
        title: d.title || 'Untitled',
        price,
        uid: d.uid || null,
        ownerName: d.ownerName || null,
        sold: !!d.sold,
        buyerName: d.buyerName || null,
        timestamp: d.timestamp || 0
      });
    });

    // client-side sort
    if (sort === 'low') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'high') {
      items.sort((a, b) => b.price - a.price);
    } else {
      // default - show newest first
      items.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (items.length === 0) {
      itemsListEl.innerHTML = `<div class="empty">No items posted yet.</div>`;
      return;
    }

    // render
    for (const item of items) {
      const el = renderItem(item);
      itemsListEl.appendChild(el);
    }

  } catch (err) {
    console.error('Error loading items:', err);
    itemsListEl.innerHTML = `<div class="empty">Failed to load items.</div>`;
  }
}

/* =========================
   RENDER SINGLE ITEM
   ========================= */
function renderItem(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'itemCard' + (item.sold ? ' sold' : '');

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = item.title;
  wrapper.appendChild(title);

  const price = document.createElement('div');
  price.className = 'price';
  // format price readable
  price.textContent = Number.isFinite(item.price) ? `₹${item.price.toLocaleString('en-IN')}` : '—';
  wrapper.appendChild(price);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = item.ownerName ? `Posted by ${item.ownerName}` : '';
  wrapper.appendChild(meta);

  // sold badge
  if (item.sold) {
    const badge = document.createElement('div');
    badge.className = 'soldBadge';
    badge.textContent = 'SOLD';
    wrapper.appendChild(badge);

    if (item.buyerName) {
      const buyer = document.createElement('div');
      buyer.className = 'meta';
      buyer.style.marginTop = '6px';
      buyer.textContent = `Bought by ${item.buyerName}`;
      wrapper.appendChild(buyer);
    }
  }

  // actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  // Buy button (only if not sold)
  if (!item.sold) {
    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn small';
    buyBtn.textContent = 'Buy Now';
    buyBtn.onclick = async () => {
      if (!currentUser) {
        alert('Sign in to buy this item.');
        return;
      }
      // prevent buying your own item? optional: allow or block. We'll allow buying but add buyer info.
      try {
        buyBtn.disabled = true;
        await updateDoc(doc(db, 'items', item.id), {
          sold: true,
          buyerUid: currentUser.uid,
          buyerName: currentUser.displayName || currentUser.email || null,
          soldAt: Date.now()
        });
        await loadItems(currentSort);
      } catch (err) {
        console.error('Buy failed:', err);
        alert('Buy failed: ' + (err.message || err));
        buyBtn.disabled = false;
      }
    };
    actions.appendChild(buyBtn);
  }

  // If current user is owner -> show Edit + Delete
  if (currentUser && currentUser.uid === item.uid) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn small';
    editBtn.textContent = 'Edit';
    editBtn.onclick = async () => {
      const newTitle = prompt('Edit title:', item.title);
      if (newTitle === null) return;
      const newPriceRaw = prompt('Edit price (numeric):', String(item.price));
      if (newPriceRaw === null) return;
      const newPrice = Number(newPriceRaw);
      if (!Number.isFinite(newPrice) || isNaN(newPrice)) {
        alert('Invalid price.');
        return;
      }
      try {
        await updateDoc(doc(db, 'items', item.id), {
          title: newTitle.trim(),
          price: newPrice
        });
        await loadItems(currentSort);
      } catch (err) {
        console.error('Edit failed:', err);
        alert('Edit failed: ' + (err.message || err));
      }
    };
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn small warn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async () => {
      if (!confirm('Delete this item? This cannot be undone.')) return;
      try {
        await deleteDoc(doc(db, 'items', item.id));
        await loadItems(currentSort);
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Delete failed: ' + (err.message || err));
      }
    };
    actions.appendChild(deleteBtn);
  }

  wrapper.appendChild(actions);
  return wrapper;
}

/* =========================
   SORT CHANGE
   ========================= */
sortEl.addEventListener('change', (e) => {
  const val = e.target.value || 'none';
  loadItems(val).catch(err => console.error(err));
});

/* =========================
   Initial load
   ========================= */
loadItems().catch(err => console.error(err));
