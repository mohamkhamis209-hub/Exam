import { db, collection, getDocs, query, where, serverTimestamp } from "../firebase.js";
import { APP_CONFIG } from "../config.js";
import { auth } from "../firebase.js";

async function call(url,body){
  if(!auth.currentUser) throw new Error("يجب تسجيل الدخول.");
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${await auth.currentUser.getIdToken()}`},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(({"email-used":"البريد الإلكتروني مستخدم بالفعل.","forbidden":"ليس لديك صلاحية.","invalid-input":"البيانات المدخلة غير صحيحة."})[d.error]||"تعذر تنفيذ العملية.");
  return d;
}
export async function listAssistants(){const s=await getDocs(query(collection(db,"users"),where("role","==","assistant")));return s.docs.map(d=>({id:d.id,...d.data()}));}
export const createAssistant=(data)=>call(APP_CONFIG.createAssistantUrl,data);
export const updateAssistant=(uid,data)=>call(APP_CONFIG.updateAssistantUrl,{uid,...data});
