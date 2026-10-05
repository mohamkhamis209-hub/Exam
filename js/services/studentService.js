import { APP_CONFIG } from "../config.js";
import { db, auth, collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "../firebase.js";
import { validatePhone, required, validateCode } from "../utils/validation.js";
import { friendlyError } from "../utils/helpers.js";

async function postJson(url, body, authenticated=false){
  const headers={"Content-Type":"application/json"};
  if(authenticated){ if(!auth.currentUser) throw new Error("سجل الدخول أولًا."); headers.Authorization=`Bearer ${await auth.currentUser.getIdToken()}`; }
  const r=await fetch(url,{method:"POST",headers,body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){ const map={"phone-used":"رقم الهاتف مستخدم بالفعل أو يوجد له طلب فعال.","invalid-phone":"أدخل رقم هاتف مصري صحيح.","invalid-class":"الصف المحدد غير صالح.","invalid-code":"كود الدخول غير صالح.","student-disabled":"الحساب غير متاح حاليًا.","code-used":"كود الدخول مستخدم بالفعل.","permission-denied":"ليس لديك صلاحية لتنفيذ هذه العملية."}; throw new Error(map[data.error]||friendlyError({message:data.error||"تعذر تنفيذ العملية."})); }
  return data;
}

export async function createRegistrationRequest({name,phone,classId,className}){
  const cleanName=required(name,"الاسم الكامل"); const p=validatePhone(phone); required(classId,"الصف");
  return postJson(APP_CONFIG.registrationRequestUrl,{name:cleanName,phone:p,classId,className});
}
export async function signInStudentByCode(code){
  const c=validateCode(code); const {customToken,profileComplete,missingFields}=await postJson(APP_CONFIG.studentLoginUrl,{code:c});
  const {signInWithCustomToken}=await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
  const credential=await signInWithCustomToken(auth,customToken); return {...credential,profileComplete,missingFields};
}
export async function getStudentByAuth(uid){
  const user=await getDoc(doc(db,"users",uid)); const profile=user.exists()?{id:user.id,...user.data()}:null;
  if(!profile?.studentId) return null;
  const s=await getDoc(doc(db,"students",profile.studentId)); return s.exists()?{id:s.id,...s.data()}:null;
}
export async function listStudents({classId}={}){const q=classId?query(collection(db,"students"),where("classId","==",classId),orderBy("createdAt","desc"),limit(100)):query(collection(db,"students"),orderBy("createdAt","desc"),limit(100));const s=await getDocs(q);return s.docs.map(d=>({id:d.id,...d.data()}));}
export async function updateStudent(id,data){return postJson(APP_CONFIG.updateStudentUrl,{studentId:id,data},true)}
export async function completeStudentProfile(data){return postJson(APP_CONFIG.profileCompletionUrl,{data},true)}
export async function createStudent(data){return postJson(APP_CONFIG.createStudentUrl,data,true)}
