import { auth, db, doc, getDoc } from "../firebase.js";
export async function currentProfile(){
  const u=auth.currentUser;if(!u)return null;
  const s=await getDoc(doc(db,"users",u.uid)); return s.exists()?{id:s.id,...s.data()}:null;
}
export async function requireRole(roles){
  const p=await currentProfile();
  if(!p || !roles.includes(p.role) || p.status === "disabled") throw new Error("غير مصرح.");
  return p;
}
export function can(p,permission){return p?.role==="super_admin" || !!p?.permissions?.[permission]}
