// main.js - full shared logic (auth, firestore, UI helpers, UPI flow)
// Uses Firebase v10 (CDN imports)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ============= CONFIG =============
const firebaseConfig = {
  apiKey: "AIzaSyAIBaheScEGv-5j8EV-xccCr6m0V9MmkpA",
  authDomain: "rampurhat-one.firebaseapp.com",
  projectId: "rampurhat-one",
  storageBucket: "rampurhat-one.firebasestorage.app",
  messagingSenderId: "648860882666",
  appId: "1:648860882666:web:d24b3ebc6f67a5f6bc2993",
  measurementId: "G-F5TJGPF9F3"
};
const upiId = "soumodityapramanik-1@okicici"; // wired UPI ID

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ============= Utilities =============
const page = document.body.dataset.page || "index";
const modalRoot = document.getElementById("modalRoot");

// simple i18n dictionary: keys used across UI
const I18 = {
  en: {
    notSigned: "Not signed in",
    createAcc: "Create account",
    signOut: "Sign Out",
    posted: "Item posted",
    buyNow: "Buy Now",
    markPaid: "Mark as Paid",
    confirmDeleteAll: "Delete ALL items? This cannot be undone.",
    ok: "OK",
    cancel: "Cancel"
  },
  bn: {
    notSigned: "সাইন ইন করা হয়নি",
    createAcc: "অ্যাকাউন্ট তৈরি করুন",
    signOut: "সাইন আউট",
    posted: "আইটেম পোস্ট করা হয়েছে",
    buyNow: "অর্ডার করুন",
    markPaid: "প্রদত্ত হিসাবে চিহ্নিত করুন",
    confirmDeleteAll: "সব আইটেম মুছে ফেলবেন? এটি পূর্বাবস্থায় ফিরবে না।",
    ok: "ঠিক আছে",
    cancel: "বাতিল"
  }
};

// read/write local preferences
function pref(key, val){
  if(arguments.length===1) return localStorage.getItem(key);
  if(val===null) localStorage.removeItem(key);
  else localStorage.setItem(key, val);
}

// modal helper (returns Promise)
function showModalHTML(html, opts = {}) {
  modalRoot.innerHTML = `
    <div class="modal-back" id="Mroot">
      <div class="modal">
        ${html}
        <div style="margin-top:12px;text-align:right">
          <button id="modalCancel" class="small-btn">${I18[getLang()].cancel}</button>
          <button id="modalOk" class="btn">${I18[getLang()].ok}</button>
        </div>
      </div>
    </div>
  `;
  modalRoot.style.display = "block";
  return new Promise(resolve => {
    document.getElementById("modalOk").onclick = () => { modalRoot.style.display = "none"; modalRoot.innerHTML=''; resolve(true);}
    document.getElementById("modalCancel").onclick = () => { modalRoot.style.display = "none"; modalRoot.innerHTML=''; resolve(false);}
  });
}

// language helper
function getLang(){
  const u = pref("ramp_lang");
  return u || "en";
}
function setLang(l){
  pref("ramp_lang", l);
  document.querySelectorAll("#langToggle").forEach(el => {
    if(el.tagName) el.value = l;
  });
  // re-render page texts if needed
}

// theme helper
function getTheme(){ return pref("ramp_theme") || "light"; }
function setTheme(t){
  pref("ramp_theme", t);
  if(t === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");
}
function toggleTheme(){
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

// show auth area (Sign in / profile)
function renderAuthArea(user){
  // finds authArea containers
  document.querySelectorAll("#authArea").forEach(root => {
    root.innerHTML = "";
    if(user){
      const name = document.createElement("div"); name.textContent = user.displayName || user.email;
      const signout = document.createElement("button"); signout.textContent = I18[getLang()].signOut; signout.className = "small-btn";
      signout.onclick = () => signOut(auth);
      root.appendChild(name); root.appendChild(signout);
    } else {
      const loginBtn = document.createElement("button"); loginBtn.textContent = "Login"; loginBtn.className = "small-btn";
      loginBtn.onclick = () => location.href = "account.html";
      root.appendChild(loginBtn);
    }
  });

  // account page profile area
  const profileArea = document.getElementById("profileArea");
  if(profileArea){
    if(user){
      profileArea.innerHTML = `<div><strong>${user.displayName || user.email}</strong></div><div class="small-muted">UID: ${user.uid}</div>`;
    } else profileArea.innerHTML = `<div class="small-muted">Sign in to edit your profile</div>`;
  }
}

// simple text apply across pages where needed
function applyI18n(){
  // this minimal version updates static text; more keys can be added as you expand
  document.querySelectorAll("[data-i18]").forEach(el=>{
    const key = el.dataset.i18;
    el.textContent = I18[getLang()][key] || I18[getLang()].notSigned;
  });
}

// ============= Auth & user doc helpers =============
async function ensureUserDoc(user, role){
  if(!user) return;
  const usersCol = collection(db, "users");
  // check if exists by uid field: (we store uid as doc id to simplify)
  // We'll use doc id = uid; but since we don't have admin SDK, we'll add doc with uid field and query.
  const q = query(usersCol, where("uid", "==", user.uid));
  const snap = await getDocs(q);
  if(snap.empty){
    // create
    await addDoc(usersCol, {
      uid: user.uid,
      role: role || "customer",
      lang: getLang(),
      theme: getTheme(),
      name: user.displayName || null,
      createdAt: Date.now()
    });
  } else {
    // ensure defaults
    const d = snap.docs[0];
    const data = d.data();
    // update user's lang/theme if stored different
    try {
      await updateDoc(doc(db, "users", d.id), {
        lang: data.lang || getLang(),
        theme: data.theme || getTheme()
      });
    } catch(e){}
  }
}

// get current user's role (reads from users collection)
async function getUserRole(uid){
  if(!uid) return null;
  const q = query(collection(db,"users"), where("uid","==", uid));
  const snap = await getDocs(q);
  if(snap.empty) return null;
  return snap.docs[0].data().role;
}

// ============= Page boot common =============
function wireCommon(){
  // connect lang selects
  document.querySelectorAll("#langToggle").forEach(el=>{
    el.innerHTML = `<option value="en">English</option><option value="bn">বাংলা</option>`;
    el.value = getLang();
    el.onchange = (e) => {
      setLang(e.target.value);
      // reload to apply strings (simple approach)
      location.reload();
    };
  });

  // theme
  document.querySelectorAll("#themeToggle").forEach(el=>{
    el.onclick = () => { toggleTheme(); };
  });
  setTheme(getTheme());
}

// ============= ITEMS: load, render, post, edit, delete =============
async function loadAllItems(sort="new"){
  const items = [];
  const snap = await getDocs(collection(db, "items"));
  snap.forEach(d => {
    const obj = { id: d.id, ...d.data() };
    // normalize price
    obj.price = Number.isFinite(Number(obj.price)) ? Number(obj.price) : 0;
    items.push(obj);
  });
  // sort
  if(sort === "low") items.sort((a,b)=>a.price - b.price);
  else if(sort === "high") items.sort((a,b)=>b.price - a.price);
  else items.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
  return items;
}

function renderItemCard(item, currentUser){
  const wrapper = document.createElement("div");
  wrapper.className = "item";
  if(item.sold) wrapper.classList.add("sold");
  const title = document.createElement("div"); title.className="title"; title.textContent = item.title || "Untitled";
  const price = document.createElement("div"); price.className="price"; price.textContent = `₹${(item.price||0).toLocaleString('en-IN')}`;
  const meta = document.createElement("div"); meta.className="meta"; meta.textContent = item.ownerName ? `Seller: ${item.ownerName}` : "";

  const actions = document.createElement("div"); actions.className="row";

  // Buy button (if not sold)
  if(!item.sold){
    const buy = document.createElement("button"); buy.className="small-btn"; buy.textContent = I18[getLang()].buyNow;
    buy.onclick = async () => {
      // create order doc beforehand? For now we open UPI
      const upi = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("Rampurhat One")}&am=${encodeURIComponent(item.price)}&cu=INR&tn=${encodeURIComponent(item.title)}`;
      // Open UPI app
      window.location.href = upi;
      // After payment user must confirm
      const ok = await showModalHTML(`<div style="padding:8px"><strong>After you finish payment in your UPI app, click Confirm to mark paid.</strong></div>`);
      if(ok){
        // mark sold and record buyer if signed-in
        try{
          await updateDoc(doc(db,"items",item.id), {
            sold: true,
            buyerUid: auth.currentUser ? auth.currentUser.uid : null,
            buyerName: auth.currentUser ? (auth.currentUser.displayName || auth.currentUser.email) : null,
            soldAt: Date.now()
          });
          await refreshPageItems();
        } catch(e){
          alert("Failed to mark paid: " + e.message);
        }
      }
    };
    actions.appendChild(buy);
  } else {
    const soldLbl = document.createElement("div"); soldLbl.className="small-muted"; soldLbl.textContent = "SOLD";
    actions.appendChild(soldLbl);
  }

  // If current user is owner -> edit / delete
  if(currentUser && currentUser.uid === item.uid){
    const edit = document.createElement("button"); edit.className="small-btn"; edit.textContent = "Edit";
    edit.onclick = async () => {
      const newTitle = prompt("Edit title:", item.title);
      if(newTitle === null) return;
      const newPriceRaw = prompt("Edit price:", String(item.price));
      if(newPriceRaw === null) return;
      const newPrice = Number(newPriceRaw);
      if(isNaN(newPrice)){ alert("Invalid price"); return; }
      await updateDoc(doc(db,"items",item.id), { title: newTitle.trim(), price: newPrice });
      await refreshPageItems();
    };
    const del = document.createElement("button"); del.className="small-btn"; del.textContent = "Delete";
    del.onclick = async () => {
      const ok = await showModalHTML(`<div>${I18[getLang()].confirmDeleteAll.replace("ALL","this")}</div>`);
      if(ok){
        await deleteDoc(doc(db,"items",item.id));
        await refreshPageItems();
      }
    };
    actions.appendChild(edit);
    actions.appendChild(del);
  }

  wrapper.appendChild(title); wrapper.appendChild(price); wrapper.appendChild(meta); wrapper.appendChild(actions);
  return wrapper;
}

async function refreshPageItems(){
  const sortSel = document.getElementById("sort");
  const sort = sortSel ? (sortSel.value === "low" ? "low" : sortSel.value === "high" ? "high" : "new") : "new";
  const items = await loadAllItems(sort);
  // page-specific rendering
  if(page === "index"){
    const list = document.getElementById("itemsList");
    list.innerHTML = "";
    items.forEach(it => list.appendChild(renderItemCard(it, auth.currentUser)));
  } else if(page === "post"){
    // merchant items list (only their items)
    const myList = document.getElementById("merchantItems");
    myList.innerHTML = "";
    items.filter(i => i.uid === (auth.currentUser ? auth.currentUser.uid : null)).forEach(it => myList.appendChild(renderItemCard(it, auth.currentUser)));
  }
}

// ============= POST, CLEAR functions (merchant) =============
async function postItemHandler(){
  if(!auth.currentUser){ alert("Sign in as merchant"); location.href = "account.html"; return; }
  // check role
  const role = await getUserRole(auth.currentUser.uid);
  if(role !== "merchant"){ alert("You must be a merchant to post"); return; }
  const title = document.getElementById("itemTitle").value.trim();
  const price = Number(document.getElementById("itemPrice").value);
  const image = document.getElementById("itemImage").value.trim();
  if(!title || isNaN(price)){ alert("Enter valid title and price"); return; }
  await addDoc(collection(db,"items"), {
    title, price, imageURL: image || null, uid: auth.currentUser.uid,
    ownerName: auth.currentUser.displayName || auth.currentUser.email || null,
    sold: false, createdAt: Date.now()
  });
  document.getElementById("itemTitle").value = ""; document.getElementById("itemPrice").value = ""; document.getElementById("itemImage").value = "";
  await refreshPageItems();
  alert(I18[getLang()].posted);
}

// delete all items (danger): visible on account page as resetBtn
async function clearAllItems(){
  const ok = await showModalHTML(`<div><strong>${I18[getLang()].confirmDeleteAll}</strong></div>`);
  if(!ok) return;
  const snap = await getDocs(collection(db,"items"));
  const promises = snap.docs.map(d => deleteDoc(doc(db,"items",d.id)));
  await Promise.all(promises);
  alert("All items deleted.");
  await refreshPageItems();
}

// delete only current user's items
async function clearMyItems(){
  if(!auth.currentUser) { alert("Sign in first"); return; }
  const ok = confirm("Delete all your items? This cannot be undone.");
  if(!ok) return;
  const q = query(collection(db,"items"), where("uid","==", auth.currentUser.uid));
  const snap = await getDocs(q);
  for(const d of snap.docs) await deleteDoc(doc(db,"items",d.id));
  alert("Your items deleted.");
  await refreshPageItems();
}

// ============= INIT per-page wiring =============
function wireIndex(){
  document.getElementById("postNav").onclick = () => { location.href = "post.html"; };
  document.getElementById("goAccount").onclick = () => { location.href = "account.html"; };
  document.getElementById("sort").onchange = () => refreshPageItems();
}

function wirePost(){
  document.getElementById("postItemBtn").onclick = postItemHandler;
  document.getElementById("clearMyItems").onclick = clearMyItems;
}

function wireAccount(){
  // create/sign-in flows
  document.getElementById("googleCreate").onclick = async () => {
    // create via popup & store role
    const role = document.getElementById("roleSelect").value || "customer";
    const res = await signInWithPopup(auth, provider);
    await ensureUserDoc(res.user, role);
    // redirect to appropriate page
    if(role === "merchant") location.href = "post.html"; else location.href = "index.html";
  };

  document.getElementById("emailCreateBtn").onclick = async () => {
    const role = document.getElementById("roleSelect").value || "customer";
    const e = document.getElementById("emailField").value;
    const p = document.getElementById("passField").value;
    if(!e || !p){ alert("Enter email & password"); return; }
    const userCred = await createUserWithEmailAndPassword(auth, e, p);
    await ensureUserDoc(userCred.user, role);
    if(role === "merchant") location.href = "post.html"; else location.href = "index.html";
  };

  document.getElementById("emailSignInBtn").onclick = async () => {
    const e = document.getElementById("emailField").value;
    const p = document.getElementById("passField").value;
    await signInWithEmailAndPassword(auth, e, p);
    location.href = "index.html";
  };

  document.getElementById("signOutBtn").onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  document.getElementById("resetBtn").onclick = clearAllItems;
}

// ============= AUTH state handling =============
onAuthStateChanged(auth, async (user) => {
  renderAuthArea(user);
  // apply persisted user preferences if any
  if(user){
    // ensure user doc exists with role
    await ensureUserDoc(user);
    // read user preferences (lang/theme) and apply if user has them
    const q = query(collection(db,"users"), where("uid","==", user.uid));
    const snap = await getDocs(q);
    if(!snap.empty){
      const data = snap.docs[0].data();
      if(data.lang) setLang(data.lang);
      if(data.theme) setTheme(data.theme);
      // set user specific fields in UI
      document.querySelectorAll("#userStatus").forEach(el => el.textContent = `Signed in as ${user.displayName || user.email}`);
    }
  } else {
    // not signed in
    document.querySelectorAll("#userStatus").forEach(el => el.textContent = I18[getLang()].notSigned);
  }
  // After auth state is settled, load items for page
  await refreshPageItems();
});

// ============= Wired startup =============
wireCommon();
applyI18n();

// page-specific
if(page === "index") wireIndex();
if(page === "post") wirePost();
if(page === "account") wireAccount();

// initial render of items
refreshPageItems().catch(e => console.error(e));
