// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBCHqreJZoJt3vDesoVH1ystrhS4U8yy8U",
    authDomain: "polynumba-auth-fb-em.firebaseapp.com",
    projectId: "polynumba-auth-fb-em",
    storageBucket: "polynumba-auth-fb-em.firebasestorage.app",
    messagingSenderId: "564381794118",
    appId: "1:564381794118:web:29413aed43166a8b082f47",
    measurementId: "G-14DQL3MFE2",
    databaseURL: "https://polynumba-auth-fb-em-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();




