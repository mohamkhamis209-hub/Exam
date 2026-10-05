import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";

initializeApp();
setGlobalOptions({region: "europe-west1", maxInstances: 10});

const db = getFirestore();
const auth = getAuth();
const PERMISSIONS = ["students","classes","subjects","courses","lectures","books","exams","results","discussions","images"];

function normalizeCode(value) { return value.trim().toUpperCase().replace(/\s+/g, ""); }
function normalizePhone(value) {
  let x = String(value || "").replace(/[^\d+]/g, "");
  if (x.startsWith("00")) x = "+" + x.slice(2);
  if (x.startsWith("01") && x.length === 11) x = "+20" + x.slice(1);
  if (x.startsWith("20") && !x.startsWith("+")) x = "+" + x;
  return x;
}
function missingStudentFields(data) {
  const fields = [];
  if (!String(data.name || "").trim()) fields.push("name");
  if (!String(data.phoneNormalized || data.phone || "").trim()) fields.push("phone");
  if (!String(data.classId || "").trim()) fields.push("classId");
  return fields;
}
function json(res, status, body) { return res.status(status).json(body); }
async function callerProfile(req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  if (!bearer) throw Object.assign(new Error("unauthenticated"), {status: 401});
  const decoded = await auth.verifyIdToken(bearer);
  const snap = await db.doc(`users/${decoded.uid}`).get();
  if (!snap.exists) throw Object.assign(new Error("forbidden"), {status: 403});
  return {uid: decoded.uid, auth: decoded, profile: snap.data()};
}
function can(profile, permission) {
  return profile.role === "super_admin" || (profile.role === "assistant" && profile.permissions?.[permission] === true);
}

/** Public registration endpoint. Validation + phone uniqueness happen server-side. */
export const submitRegistrationRequest = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, {error: "method-not-allowed"});
  try {
    const {name, phone, classId, className} = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanPhone = normalizePhone(String(phone || ""));
    const cleanClassId = String(classId || "").trim();
    if (!cleanName || cleanName.length > 120) return json(res, 400, {error: "invalid-name"});
    if (!/^\+20\d{10}$/.test(cleanPhone)) return json(res, 400, {error: "invalid-phone"});
    if (!cleanClassId) return json(res, 400, {error: "invalid-class"});
    const cls = await db.doc(`classes/${cleanClassId}`).get();
    if (!cls.exists || cls.data()?.status !== "active") return json(res, 400, {error: "invalid-class"});
    const requestRef = db.collection("registrationRequests").doc();
    const lockRef = db.doc(`phoneLocks/${cleanPhone.replace(/\W/g, "")}`);
    await db.runTransaction(async tx => {
      const lock = await tx.get(lockRef);
      if (lock.exists && ["pending", "approved"].includes(lock.data()?.status)) throw Object.assign(new Error("phone-used"), {status: 409});
      tx.set(lockRef, {status: "pending", requestId: requestRef.id, createdAt: FieldValue.serverTimestamp()});
      tx.set(requestRef, {requestId: requestRef.id, name: cleanName, phone: cleanPhone, phoneNormalized: cleanPhone, classId: cleanClassId, className: String(cls.data()?.name || ""), status: "pending", createdAt: FieldValue.serverTimestamp()});
    });
    return json(res, 200, {requestId: requestRef.id});
  } catch (e) {
    if (e?.message === "phone-used") return json(res, 409, {error: "phone-used"});
    console.error(e); return json(res, 500, {error: "internal"});
  }
});

export const studentLogin = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, {error: "method-not-allowed"});
  try {
    const code = normalizeCode(String(req.body?.code || ""));
    if (!/^[A-Z0-9-]{6,32}$/.test(code)) return json(res, 400, {error: "invalid-code"});
    const snap = await db.collection("students").where("loginCode", "==", code).limit(1).get();
    if (snap.empty) return json(res, 401, {error: "invalid-code"});
    const st = snap.docs[0], data = st.data();
    if (data.status !== "active") return json(res, 403, {error: "student-disabled"});
    let uid = data.authUid;
    if (!uid) {
      const created = await auth.createUser({displayName: data.name || "طالب", disabled: false});
      let createdUid = created.uid;
      let winnerUid = createdUid;
      await db.runTransaction(async tx => {
        const fresh = await tx.get(st.ref);
        const freshData = fresh.data() || {};
        winnerUid = freshData.authUid || createdUid;
        tx.update(st.ref, {authUid: winnerUid, updatedAt: FieldValue.serverTimestamp()});
        tx.set(db.doc(`users/${winnerUid}`), {role: "student", studentId: st.id, classId: freshData.classId || null, className: freshData.className || null, status: "active", displayName: freshData.name || "طالب", createdAt: FieldValue.serverTimestamp()}, {merge: true});
      });
      uid = winnerUid;
      if (winnerUid !== createdUid) await auth.deleteUser(createdUid).catch(()=>{});
    }
    const missing = missingStudentFields(data);
    const token = await auth.createCustomToken(uid, {role: "student", studentId: st.id});
    return json(res, 200, {customToken: token, profileComplete: missing.length === 0, missingFields: missing});
  } catch (e) { console.error(e); return json(res, 500, {error: "internal"}); }
});


export const completeStudentProfile = onRequest({cors:true}, async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"method-not-allowed"});
  try{
    const {uid,profile}=await callerProfile(req); if(profile.role!=="student") return json(res,403,{error:"forbidden"});
    const {data={}}=req.body||{}; const studentId=String(profile.studentId||""); if(!studentId) return json(res,400,{error:"missing-student"});
    const ref=db.doc(`students/${studentId}`); const snap=await ref.get(); if(!snap.exists || snap.data()?.authUid!==uid) return json(res,403,{error:"forbidden"});
    const old=snap.data(); const update={};
    if(!String(old.name||"").trim() && data.name!==undefined) update.name=String(data.name).trim();
    if(!String(old.phoneNormalized||old.phone||"").trim() && data.phone!==undefined){const phone=normalizePhone(String(data.phone||"")); if(!/^\+20\d{10}$/.test(phone)) return json(res,400,{error:"invalid-phone"}); update.phone=phone;update.phoneNormalized=phone;}
    if(!String(old.classId||"").trim() && data.classId!==undefined){const classId=String(data.classId).trim(); const cls=await db.doc(`classes/${classId}`).get(); if(!cls.exists || cls.data()?.status!=="active") return json(res,400,{error:"invalid-class"}); update.classId=classId;update.className=String(cls.data()?.name||"");}
    if(!Object.keys(update).length) return json(res,400,{error:"nothing-to-update"});
    await db.runTransaction(async tx=>{
      const current=await tx.get(ref); const currentData=current.data();
      for(const field of ["name","phoneNormalized","classId"]){ if(String(currentData[field]||"").trim()) throw Object.assign(new Error("already-completed"),{status:409}); }
      if(update.phoneNormalized){const lockRef=db.doc(`phoneLocks/${update.phoneNormalized.replace(/\W/g,"")}`);const lock=await tx.get(lockRef);if(lock.exists && lock.data()?.studentId!==studentId && ["pending","approved"].includes(lock.data()?.status))throw Object.assign(new Error("phone-used"),{status:409});tx.set(lockRef,{status:"approved",studentId,createdAt:FieldValue.serverTimestamp()});}
      tx.update(ref,{...update,updatedAt:FieldValue.serverTimestamp()});
      tx.set(db.doc(`users/${uid}`),{displayName:update.name||currentData.name||"طالب",classId:update.classId||currentData.classId||null,className:update.className||currentData.className||null,status:currentData.status||"active"},{merge:true});
    });
    return json(res,200,{ok:true});
  }catch(e){if(e?.message==="phone-used")return json(res,409,{error:"phone-used"});if(e?.message==="already-completed")return json(res,409,{error:"already-completed"});console.error(e);return json(res,500,{error:"internal"});}
});

export const createStudent = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, {error: "method-not-allowed"});
  try {
    const {profile} = await callerProfile(req);
    if (!can(profile, "students")) return json(res, 403, {error: "forbidden"});
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const phone = normalizePhone(String(body.phone || ""));
    const classId = String(body.classId || "").trim();
    const className = String(body.className || "").trim();
    const loginCode = normalizeCode(String(body.loginCode || ""));
    if (!loginCode || !/^[A-Z0-9-]{6,32}$/.test(loginCode)) return json(res, 400, {error: "invalid-code"});
    const studentRef = db.collection("students").doc();
    const codeRef = db.doc(`uniqueKeys/code_${loginCode}`);
    const phoneRef = phone ? db.doc(`phoneLocks/${phone.replace(/\W/g, "")}`) : null;
    await db.runTransaction(async tx => {
      const codeSnap = await tx.get(codeRef);
      if (codeSnap.exists) throw Object.assign(new Error("code-used"), {status: 409});
      if (classId) {
        const cls = await tx.get(db.doc(`classes/${classId}`));
        if (!cls.exists) throw Object.assign(new Error("invalid-class"), {status: 400});
      }
      if (phoneRef) {
        const lock = await tx.get(phoneRef);
        if (lock.exists && ["pending","approved"].includes(lock.data()?.status)) throw Object.assign(new Error("phone-used"), {status: 409});
        tx.set(phoneRef, {status: "approved", studentId: studentRef.id, createdAt: FieldValue.serverTimestamp()});
      }
      tx.set(codeRef, {type: "loginCode", studentId: studentRef.id, createdAt: FieldValue.serverTimestamp()});
      tx.set(studentRef, {name, phone: phone || "", phoneNormalized: phone || "", classId: classId || "", className: className || "", loginCode, status: "active", createdBy: profile.role, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()});
    });
    return json(res, 200, {studentId: studentRef.id});
  } catch (e) {
    if (e?.message === "code-used") return json(res, 409, {error: "code-used"});
    if (e?.message === "phone-used") return json(res, 409, {error: "phone-used"});
    if (e?.message === "invalid-class") return json(res, 400, {error: "invalid-class"});
    if (e?.status) return json(res, e.status, {error: e.message});
    console.error(e); return json(res, 500, {error: "internal"});
  }
});

export const updateStudentByAdmin = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, {error: "method-not-allowed"});
  try {
    const {profile} = await callerProfile(req);
    if (!can(profile, "students")) return json(res, 403, {error: "forbidden"});
    const {studentId, data} = req.body || {};
    if (!studentId || !data || typeof data !== "object") return json(res, 400, {error: "invalid-input"});
    const ref = db.doc(`students/${studentId}`);
    const snap = await ref.get(); if (!snap.exists) return json(res, 404, {error: "not-found"});
    const update = {};
    if (data.name !== undefined) update.name = String(data.name).trim();
    if (data.classId !== undefined) update.classId = String(data.classId).trim();
    if (data.className !== undefined) update.className = String(data.className).trim();
    if (data.status !== undefined && ["active","suspended","disabled"].includes(data.status)) update.status = data.status;
    if (data.phone !== undefined) {
      const phone = normalizePhone(String(data.phone || ""));
      if (phone && !/^\+20\d{10}$/.test(phone)) return json(res, 400, {error: "invalid-phone"});
      update.phone = phone; update.phoneNormalized = phone;
    }
    await db.runTransaction(async tx => {
      const current = await tx.get(ref); const old = current.data() || {};
      if (update.classId) { const cls = await tx.get(db.doc(`classes/${update.classId}`)); if (!cls.exists) throw Object.assign(new Error("invalid-class"), {status: 400}); }
      if (update.phoneNormalized !== undefined && update.phoneNormalized !== old.phoneNormalized) {
        if (update.phoneNormalized) {
          const newLock = db.doc(`phoneLocks/${update.phoneNormalized.replace(/\W/g, "")}`);
          const lock = await tx.get(newLock);
          if (lock.exists && lock.data()?.studentId !== studentId && ["pending","approved"].includes(lock.data()?.status)) throw Object.assign(new Error("phone-used"), {status: 409});
          tx.set(newLock, {status: "approved", studentId, createdAt: FieldValue.serverTimestamp()});
        }
        if (old.phoneNormalized) tx.delete(db.doc(`phoneLocks/${old.phoneNormalized.replace(/\W/g, "")}`));
      }
      tx.update(ref, {...update, updatedAt: FieldValue.serverTimestamp()});
      if (old.authUid) tx.set(db.doc(`users/${old.authUid}`), {displayName: update.name ?? old.name, classId: update.classId ?? old.classId ?? null, className: update.className ?? old.className ?? null, status: update.status ?? old.status}, {merge: true});
    });
    return json(res, 200, {ok: true});
  } catch (e) {
    if (e?.message === "phone-used") return json(res, 409, {error: "phone-used"});
    if (e?.message === "invalid-class") return json(res, 400, {error: "invalid-class"});
    console.error(e); return json(res, 500, {error: "internal"});
  }
});

export const createAssistant = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, {error: "method-not-allowed"});
  try {
    const {profile} = await callerProfile(req);
    if (profile.role !== "super_admin") return json(res, 403, {error: "forbidden"});
    const {email,password,displayName,permissions={}} = req.body || {};
    if (!email || !password || String(password).length < 10 || !displayName) return json(res, 400, {error: "invalid-input"});
    const safePermissions = {};
    for (const p of PERMISSIONS) safePermissions[p] = permissions[p] === true;
    const u = await auth.createUser({email:String(email).trim(), password:String(password), displayName:String(displayName).trim(), disabled:false});
    await db.doc(`users/${u.uid}`).set({role:"assistant",email:String(email).trim(),displayName:String(displayName).trim(),permissions:safePermissions,status:"active",createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    return json(res, 200, {uid:u.uid});
  } catch (e) { console.error(e); return json(res, e?.code === "auth/email-already-exists" ? 409 : 500, {error:e?.code === "auth/email-already-exists" ? "email-used" : "internal"}); }
});

export const updateAssistant = onRequest({cors:true}, async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"method-not-allowed"});
  try{
    const {profile}=await callerProfile(req); if(profile.role!=="super_admin") return json(res,403,{error:"forbidden"});
    const {uid,displayName,permissions,status}=req.body||{}; if(!uid) return json(res,400,{error:"invalid-input"});
    const ref=db.doc(`users/${uid}`), snap=await ref.get(); if(!snap.exists || snap.data()?.role!=="assistant") return json(res,404,{error:"not-found"});
    const safePermissions={}; for(const p of PERMISSIONS) safePermissions[p]=permissions?.[p]===true;
    await ref.update({displayName:String(displayName||snap.data()?.displayName||"").trim(),permissions:safePermissions,status:status==="disabled"?"disabled":"active",updatedAt:FieldValue.serverTimestamp()});
    await auth.updateUser(uid,{displayName:String(displayName||snap.data()?.displayName||"").trim(),disabled:status==="disabled"});
    return json(res,200,{ok:true});
  }catch(e){console.error(e);return json(res,500,{error:"internal"});}
});

export const createDiscussionReply = onRequest({cors:true}, async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"method-not-allowed"});
  try{
    const {uid,profile}=await callerProfile(req); if(!can(profile,"discussions")) return json(res,403,{error:"forbidden"});
    const {lectureId,courseId,content,parentId=null,official=false}=req.body||{}; const text=String(content||"").trim();
    if(!lectureId || !courseId || !text || text.length>3000) return json(res,400,{error:"invalid-input"});
    const ref=db.collection("discussionPosts").doc();
    await ref.set({lectureId,courseId,studentId:null,authorId:uid,authorName:profile.displayName||profile.email||"المشرف",authorRole:profile.role,isInstructorReply:true,isPinned:false,isOfficial:official===true,status:"active",content:text,parentId,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    return json(res,200,{id:ref.id});
  }catch(e){console.error(e);return json(res,e?.status||500,{error:e?.message||"internal"});}
});

export const setOfficialReply = onRequest({cors:true}, async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"method-not-allowed"});
  try{
    const {profile}=await callerProfile(req); if(!can(profile,"discussions")) return json(res,403,{error:"forbidden"});
    const {postId,pinned=true}=req.body||{}; if(!postId) return json(res,400,{error:"invalid-input"});
    const ref=db.doc(`discussionPosts/${postId}`); const snap=await ref.get(); if(!snap.exists) return json(res,404,{error:"not-found"});
    const data=snap.data(); if(!data.isInstructorReply) return json(res,400,{error:"not-instructor-reply"});
    const batch=db.batch();
    if(pinned){
      const existing=await db.collection("discussionPosts").where("lectureId","==",data.lectureId).where("isInstructorReply","==",true).where("isPinned","==",true).get();
      existing.docs.forEach(d=>batch.update(d.ref,{isPinned:false,updatedAt:FieldValue.serverTimestamp()}));
    }
    batch.update(ref,{isPinned:!!pinned,isOfficial:!!pinned,updatedAt:FieldValue.serverTimestamp()}); await batch.commit();
    return json(res,200,{ok:true});
  }catch(e){console.error(e);return json(res,500,{error:"internal"});}
});

export const getExamQuestions = onRequest({cors:true}, async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"method-not-allowed"});
  try{
    const {uid,profile}=await callerProfile(req); if(profile.role!=="student" || profile.status!=="active") return json(res,403,{error:"forbidden"});
    const examId=String(req.body?.examId||""); const exam=await db.doc(`exams/${examId}`).get(); if(!exam.exists || exam.data()?.status!=="active") return json(res,404,{error:"not-found"});
    const examData=exam.data();
    if(profile.classId && examData.classId && profile.classId!==examData.classId) return json(res,403,{error:"forbidden"});
    const qs=await db.collection("questions").where("examId","==",examId).orderBy("sortOrder","asc").get();
    return json(res,200,{exam:{id:exam.id,title:examData.title,description:examData.description||"",duration:examData.duration||0},questions:qs.docs.map(d=>({id:d.id,question:d.data().question,options:d.data().options||[],points:d.data().points||1,image:d.data().image||null,sortOrder:d.data().sortOrder||0}))});
  }catch(e){console.error(e);return json(res,500,{error:"internal"});}
});

export const submitExam = onRequest({cors:true}, async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"method-not-allowed"});
  try{
    const {uid,profile}=await callerProfile(req); if(profile.role!=="student" || profile.status!=="active") return json(res,403,{error:"forbidden"});
    const {examId,answers={},duration=0}=req.body||{}; const exam=await db.doc(`exams/${examId}`).get(); if(!exam.exists) return json(res,404,{error:"not-found"});
    const qSnap=await db.collection("questions").where("examId","==",examId).get();
    let score=0,total=0; qSnap.docs.forEach(d=>{const q=d.data(); const pts=Number(q.points||1); total+=pts; if(String(answers[d.id]??"")===String(q.correctAnswer??"")) score+=pts;});
    const keyRef=db.doc(`resultKeys/${uid}_${examId}`); const resultRef=db.collection("results").doc();
    await db.runTransaction(async tx=>{const key=await tx.get(keyRef); if(key.exists) throw Object.assign(new Error("result-exists"),{status:409}); tx.set(keyRef,{studentId:uid,examId,createdAt:FieldValue.serverTimestamp()}); tx.set(resultRef,{studentId:uid,examId,score,total,percentage:total?Math.round(score/total*10000)/100:0,submittedAt:FieldValue.serverTimestamp(),duration:Number(duration)||0});});
    return json(res,200,{resultId:resultRef.id,score,total,percentage:total?Math.round(score/total*10000)/100:0});
  }catch(e){if(e?.message==="result-exists")return json(res,409,{error:"result-exists"});console.error(e);return json(res,500,{error:"internal"});}
});
