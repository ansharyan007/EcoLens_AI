// Firebase Configuration
// Get your config from: https://console.firebase.google.com

const firebaseConfig = {
    apiKey: "AIzaSyDBPfTfjKys1mPQE7LQ535gSgiHR-ZxLu8",
    authDomain: "ecolens-ai-18544.firebaseapp.com",
    projectId: "ecolens-ai-18544",
    storageBucket: "ecolens-ai-18544.firebasestorage.app",
    messagingSenderId: "528597463277",
    appId: "1:528597463277:web:9367bf3bc41304d98e1ce4",
    measurementId: "G-6MB4WMXWD2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for use in other files
window.auth = auth;
window.db = db;
window.storage = storage;

console.log('Firebase initialized successfully');
