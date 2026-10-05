# DATA CATALOG — منصتك التعليمية

> المرجع الرسمي لبنية Firestore. أي تغيير في هذا الملف يجب أن ينعكس في الكود وSecurity Rules.

## DATA CATALOG CHANGE
### Collection: students
- إضافة/تأكيد `authUid` لربط ملف الطالب بحساب Firebase Auth.
- الحقول `name`, `phone/phoneNormalized`, `classId/className` قد تكون فارغة فقط عندما ينشئ المشرف الطالب مباشرة.
- إذا كانت بيانات الطالب جاءت من `registrationRequests` فهي مكتملة قبل الاعتماد.
- الطالب لا يستطيع تعديل ملفه مباشرة من Firestore؛ استكمال البيانات يتم عبر `completeStudentProfile` التي تتحقق من أن الحقل كان ناقصًا قبل تغييره.

### Collection: users
- ملف الطالب يحتفظ بـ `role=student`, `studentId`, `classId`, `className`, `status` لمساعدة Security Rules.
- يتم مزامنة هذه البيانات مع `students` بواسطة Cloud Function عند استكمال الملف.

### Functions
إضافة وظائف موثوقة:
- `submitRegistrationRequest`
- `studentLogin`
- `completeStudentProfile`
- `createStudent`
- `updateStudentByAdmin`
- `createAssistant`
- `updateAssistant`
- `createDiscussionReply`
- `setOfficialReply`
- `getExamQuestions`
- `submitExam`

## users
- role: `super_admin | assistant | student`
- displayName: string
- email: string optional
- studentId: string optional
- classId/className: string optional
- status: `active | disabled` أو حالة الطالب `active | suspended | disabled`
- permissions: map<boolean> للمساعد
- createdAt, updatedAt timestamps

## registrationRequests
- requestId, name, phone, phoneNormalized, classId, className
- status: `pending | approved | rejected`
- createdAt, approvedAt, rejectedAt timestamps
- approvedBy/rejectedBy uid

> الإنشاء العام يتم فقط عبر `submitRegistrationRequest`، وليس عبر Firestore من المتصفح.

## students
- name: string — Required عند اعتماد طلب الطالب، Optional مؤقتًا في الحساب الذي أنشأه المشرف.
- phone, phoneNormalized: string — نفس القاعدة.
- classId, className: string — نفس القاعدة.
- loginCode: string unique
- authUid: Firebase Auth UID بعد أول دخول
- status: `active | suspended | disabled`
- requestId optional
- createdBy optional
- createdAt, approvedAt, updatedAt timestamps

## phoneLocks
Document ID = normalized phone بدون الرموز.
- status: `pending | approved`
- requestId أو studentId
- createdAt

> لا يمكن للواجهة القراءة أو الكتابة المباشرة إلى هذه المجموعة.

## uniqueKeys
مفاتيح uniqueness، وأهمها:
- `code_{loginCode}`

> لا يمكن للواجهة القراءة أو الكتابة المباشرة إلى هذه المجموعة.

## classes
- name, description, image
- status, sortOrder
- createdAt, updatedAt

> قراءة الصفوف النشطة متاحة حتى قبل تسجيل الدخول فقط لإتمام طلب التسجيل؛ لا يوجد كشف للكورسات أو المحاضرات للزائر.

## subjects
- name, classId, description, image
- status, sortOrder
- createdAt, updatedAt

## courses
- name, description, classId, subjectId, image, teacherName
- status, sortOrder
- createdAt, updatedAt

## lectures
- courseId, title, description
- youtubeUrl, youtubeVideoId, thumbnail
- sortOrder, status
- createdAt, updatedAt

## books
- title, description, courseId
- lectureId optional — فارغ = كتاب عام للكورس
- driveUrl, image, type, status
- createdAt, updatedAt

## exams
- title, description, courseId
- lectureId optional
- classId optional
- duration, status, questionsCount
- createdAt, updatedAt

## questions
- examId
- question
- options: array<string>
- correctAnswer
- points
- image optional
- sortOrder

> `correctAnswer` لا يُرسل للطالب. الطالب يحصل على نسخة sanitized من خلال `getExamQuestions`.

## results
- studentId
- examId
- score
- total
- percentage
- submittedAt
- duration

> إنشاء النتيجة النهائية يتم عبر `submitExam` لمنع تزوير الدرجة.

## resultKeys
Document ID = `${studentId}_${examId}`.
> تستخدم كقفل لمنع النتيجة المكررة.

## discussionPosts
- lectureId, courseId
- studentId: UID للطالب، وnull لرد المشرف
- authorId: UID للمشرف في ردوده
- authorName
- authorRole: `student | assistant | super_admin`
- content, parentId
- isInstructorReply
- isPinned
- isOfficial
- status
- createdAt, updatedAt

> الطالب يستطيع إنشاء/تعديل منشوراته فقط. رد المشرف والتثبيت يتمان عبر Cloud Functions.

## discussionReports
- postId, reporterId, reason, status, createdAt

## notifications
- userId, type, title, body, read, createdAt

## activityLogs
- actorId, actorRole, action
- targetType, targetId
- metadata
- createdAt

## images
- imageId
- url, displayUrl, thumbUrl, mediumUrl, deleteUrl
- title, category
- createdAt
- uploadedBy

## Permission vocabulary
`students`, `classes`, `subjects`, `courses`, `lectures`, `books`, `exams`, `results`, `discussions`, `images`.

## Security principles
- لا توجد Rules مفتوحة.
- الطالب لا يقرأ إلا محتوى صفه عندما يكون ملفه مكتملًا وفعالًا.
- الطالب لا يستطيع تعديل role أو studentId أو صلاحياته.
- الطالب لا يستطيع إنشاء رد مشرف.
- `correctAnswer` لا يصل إلى الطالب.
- Super Admin فقط ينشئ ويعدل المشرفين المساعدين.
- الهاتف وكود الدخول محميان بطبقة uniqueness server-side.
