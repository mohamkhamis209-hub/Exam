import { db, collection, doc, getDocs, addDoc, updateDoc, query, where, runTransaction, serverTimestamp } from "../firebase.js";
export const saveExam=async(id,data)=>{const ref=id?doc(db,"exams",id):doc(collection(db,"exams")); if(id)await updateDoc(ref,{...data,updatedAt:serverTimestamp()});else await addDoc(collection(db,"exams"),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});return ref.id};
export async function submitResult(studentId,examId,result){
  const ref=doc(db,"resultKeys",`${studentId}_${examId}`);
  return runTransaction(db,async tx=>{const s=await tx.get(ref);if(s.exists())throw new Error("تم تسجيل نتيجة هذا الامتحان بالفعل.");tx.set(ref,{studentId,examId,createdAt:serverTimestamp()});const r=doc(collection(db,"results"));tx.set(r,{studentId,examId,...result,submittedAt:serverTimestamp()});return r.id});
}
