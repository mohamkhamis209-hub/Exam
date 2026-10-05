import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, updatePassword
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, startAfter, runTransaction,
  serverTimestamp, Timestamp, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlXtyhDacyq6ToDeYkG377RyFmjkaqFyM",
  authDomain: "mr-omar-new.firebaseapp.com",
  projectId: "mr-omar-new",
  storageBucket: "mr-omar-new.firebasestorage.app",
  messagingSenderId: "146072056100",
  appId: "1:146072056100:web:b940343335bed1b81a83b1",
  measurementId: "G-KYGRBH3Y1P"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, updatePassword,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, runTransaction, serverTimestamp,
  Timestamp, onSnapshot, writeBatch
};
