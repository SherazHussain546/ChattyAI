
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDc3opydQnG6nDYHA00GiVAq79lXse3oSc",
  authDomain: "chattyai-e8364.firebaseapp.com",
  projectId: "chattyai-e8364",
  storageBucket: "chattyai-e8364.appspot.com",
  messagingSenderId: "760093164825",
  appId: "1:760093164825:web:a04f62679a384277f0f188"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
