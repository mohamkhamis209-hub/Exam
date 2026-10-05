import { auth, onAuthStateChanged, signOut } from "../firebase.js";
export function watchStudent(cb){return onAuthStateChanged(auth,cb)}
export const studentLogout=()=>signOut(auth);
