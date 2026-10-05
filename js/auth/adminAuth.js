import { auth, signInWithEmailAndPassword, signOut } from "../firebase.js";
import { requireRole } from "../utils/security.js";
export async function adminLogin(email,password){const c=await signInWithEmailAndPassword(auth,email,password);await requireRole(["super_admin","assistant"]);return c}
export const adminLogout=()=>signOut(auth);
