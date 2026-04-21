import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCe-Jc8x39TpQB4IJm0kCYPwBtMw2LhZEg",
  authDomain: "wellvara-27c7c.firebaseapp.com",
  projectId: "wellvara-27c7c",
  storageBucket: "wellvara-27c7c.firebasestorage.app",
  messagingSenderId: "64183657465",
  appId: "1:64183657465:web:1cc2cb4e45c0efffbad328",
  measurementId: "G-TJMW3P1S65"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
