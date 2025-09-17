import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } 
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

// Init Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Sign in
function signIn() {
  signInWithRedirect(auth, provider);
}
getRedirectResult(auth).then((result)=>{
  if(result.user){
    document.getElementById("userStatus").innerText = "Signed in as " + result.user.displayName;
    loadItems();
  }
}).catch((err)=>console.error(err));

// Post item
async function postItem(title, price){
  if(!auth.currentUser){
    alert("Sign in first!");
    return;
  }
  try{
    await addDoc(collection(db,"items"),{
      title, price, uid: auth.currentUser.uid, timestamp: Date.now()
    });
    document.getElementById("itemTitle").value = "";
    document.getElementById("itemPrice").value = "";
    loadItems();
  }catch(err){
    alert("Error: "+err.message);
  }
}

// Load items
async function loadItems(){
  const list = document.getElementById("itemsList");
  list.innerHTML="";
  try{
    const snapshot = await getDocs(collection(db,"items"));
    snapshot.forEach((doc)=>{
      const data = doc.data();
      const div = document.createElement("div");
      div.className="itemCard glass-card";
      div.innerHTML = `<span>${data.title}</span><span>₹${data.price}</span>`;
      list.appendChild(div);
    });
  }catch(err){console.error(err);}
}

// Events
window.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("signin").addEventListener("click",signIn);
  document.getElementById("postItemBtn").addEventListener("click",()=>{
    const t=document.getElementById("itemTitle").value;
    const p=parseFloat(document.getElementById("itemPrice").value);
    postItem(t,p);
  });
  loadItems();
});
