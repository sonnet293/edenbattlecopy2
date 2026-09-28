// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCB_ojNPf3hSEl8m-hx-Ba87Bf5l7pPic",
  authDomain: "pokebattle-7a6b0.firebaseapp.com",
  projectId: "pokebattle-7a6b0",
  storageBucket: "pokebattle-7a6b0.firebasestorage.app",
  messagingSenderId: "713322888133",
  appId: "1:713322888133:web:7b495cdd2a50ecf3d2e9ac"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);