import { db, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp } from "../firebase.js";
const coll=n=>collection(db,n);
export async function listCollection(name,{field,value,filters=[],limitN=100}={}){
  const conditions=[...(field?[{field,value}]:[]),...filters];
  let q=coll(name); for(const f of conditions) q=query(q,where(f.field,"==",f.value));
  if(!conditions.length) q=query(q,orderBy("createdAt","desc"));
  q=query(q,limit(limitN)); const s=await getDocs(q); return s.docs.map(d=>({id:d.id,...d.data()}));
}
export const getOne=async(name,id)=>{const s=await getDoc(doc(db,name,id));return s.exists()?{id:s.id,...s.data()}:null};
export async function saveEntity(name,id,data){const ref=id?doc(db,name,id):doc(coll(name));if(id)await updateDoc(ref,{...data,updatedAt:serverTimestamp()});else await addDoc(coll(name),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});return ref.id}
export const removeEntity=(name,id)=>deleteDoc(doc(db,name,id));
