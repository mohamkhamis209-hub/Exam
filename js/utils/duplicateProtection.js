import { db, doc, runTransaction, serverTimestamp } from "../firebase.js";
export async function claimUnique(key,value,data){
  const ref=doc(db,"uniqueKeys",key+"_"+value);
  return runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    if(snap.exists()) throw new Error("القيمة مستخدمة بالفعل.");
    tx.set(ref,{...data,createdAt:serverTimestamp()}); return ref.id;
  });
}
export const uniquePhoneKey=(phone)=>`phone_${phone.replace(/\W/g,"")}`;
export const uniqueCodeKey=(code)=>`code_${code}`;
