import { initializeApp } from 'firebase/app';
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import {getMessaging} from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyD5mxOD_hZg-alNRF5dWy81kVHfiO2bmIU",
    authDomain: "white-lotus-blog.firebaseapp.com",
    projectId: "white-lotus-blog",
    storageBucket: "white-lotus-blog.firebasestorage.app",
    messagingSenderId: "863315670713",
    appId: "1:863315670713:web:d805535333e31030aa4d68",
    measurementId: "G-2H85315QSC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// const messaging = getMessaging(app);

export { db, auth };
