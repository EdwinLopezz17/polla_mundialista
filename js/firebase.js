import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyCEtoklMJRM4q8JDc2RJSGDDDXdTBI3-Qs",
    authDomain: "pollafutbolera-cd2e5.firebaseapp.com",
    projectId: "pollafutbolera-cd2e5",
    storageBucket: "pollafutbolera-cd2e5.firebasestorage.app",
    messagingSenderId: "770223946672",
    appId: "1:770223946672:web:2e6e57a229977abdcaf475"
});

export const db = getFirestore(app);