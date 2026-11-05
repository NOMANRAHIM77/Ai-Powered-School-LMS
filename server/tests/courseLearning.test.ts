import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { Teacher } from '../src/models/Teacher';
import { AcademicYear } from '../src/models/AcademicYear';
import { Enrollment } from '../src/models/Enrollment';
import { Course } from '../src/models/Course';
import { CourseActivity, CourseWork } from '../src/models/CourseActivity';
import routes, { activityInput, publicActivity } from '../src/routes/courseLearning.routes';
import { generateAccessToken } from '../src/utils/tokens';
import * as marking from '../src/services/assignedQuizGrading';
import { errorHandler } from '../src/middleware/errorHandler';

test('activity validation requires future deadlines and valid MCQ keys; student payloads hide answer keys', () => {
  const quiz = { kind: 'quiz', title: 'Test', opensAt: new Date().toISOString(), dueAt: new Date(Date.now()+60000).toISOString(), durationMinutes: 1, quizType: 'mcq', questions: [{ prompt: '2+2?', options: ['3','4'], correct: 1, marks: 2 }] };
  assert.equal(activityInput.safeParse(quiz).success, true);
  assert.equal(activityInput.safeParse({...quiz,questions:[{...quiz.questions[0],correct:5}]}).success,false);
  assert.equal(activityInput.safeParse({...quiz,dueAt:'2020-01-01T00:00:00.000Z'}).success,false);
  assert.equal(publicActivity(quiz,false).questions[0].correct,undefined);
  assert.equal(publicActivity(quiz,true).questions[0].correct,1);
});

test('course learning enforces ownership, quiz timing, grade bounds and saved answers after expiry', async () => {
  const oldGrade = marking.gradeAssignedWork; (marking as any).gradeAssignedWork = async () => {};
  const old = { user:User.findById,student:Student.findOne,teacher:Teacher.findOne,year:AcademicYear.findOne,enrollment:Enrollment.findOne,course:Course.findOne,activity:CourseActivity.findById,work:CourseWork.findOne,update:CourseWork.findOneAndUpdate,create:CourseWork.create };
  const userId=new Types.ObjectId(),studentId=new Types.ObjectId(),teacherId=new Types.ObjectId(),courseId=new Types.ObjectId(),activityId=new Types.ObjectId(),workId=new Types.ObjectId(),sectionId=new Types.ObjectId();
  let role='student', assigned=true; let lastUpdate:any; let work:any = {_id:workId,deadline:new Date(Date.now()+60000),answers:['0'],submittedAt:null};
  const activity:any={_id:activityId,courseId,kind:'quiz',quizType:'mcq',maxMarks:2,opensAt:new Date(Date.now()-10000),dueAt:new Date(Date.now()+120000),durationMinutes:1,questions:[{prompt:'2+2?',options:['3','4'],correct:1,marks:2}],attachments:[]};
  (User as any).findById=()=>({select:async()=>({_id:userId,role,isActive:true,name:'Test',email:'test@example.test'})});
  (Student as any).findOne=async()=>({_id:studentId}); (Teacher as any).findOne=async()=>({_id:teacherId}); (AcademicYear as any).findOne=async()=>({_id:'year'}); (Enrollment as any).findOne=async()=>({sectionId});
  (Course as any).findOne=async(filter:any)=>{assert.equal(filter.academicYearId,'year'); if(role==='teacher')assert.equal(String(filter.teacherId),String(teacherId));else assert.equal(String(filter.sectionId),String(sectionId)); return assigned?{_id:courseId}:null;};
  (CourseActivity as any).findById=()=>({select:async()=>activity});
  const fileId = new Types.ObjectId(); let created:any;
  (CourseWork as any).create=async(value:any)=>{created=value;return {_id:workId};};
  (CourseWork as any).findOne=(filter:any)=>filter._id ? { select: async()=>{assert.equal(String(filter.studentId),String(studentId)); return String(filter._id)===String(workId) ? {attachments:{id:(id:string)=>id===String(fileId)?{name:'answer.txt',type:'text/plain',data:Buffer.from('My answer')}:null}}:null;} } : Promise.resolve(work);
  (CourseWork as any).findOneAndUpdate=async(filter:any,update:any)=>{lastUpdate=update;return {...work,...update.$set};};
  const app=express();app.use(express.json());app.use('/learning',routes);app.use(errorHandler);const server=app.listen(0,'127.0.0.1');
  try {
    await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert.ok(address&&typeof address!=='string');const token=generateAccessToken({_id:String(userId),role:'student',name:'Test',email:'test@example.test'});
    const request=(method:string,path:string,body?:any)=>fetch(`http://127.0.0.1:${address.port}/learning/activities/${activityId}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
    assigned=false;assert.equal((await request('POST','/start')).status,404);assigned=true;
    activity.opensAt=new Date(Date.now()+60000);assert.equal((await request('POST','/start')).status,409);activity.opensAt=new Date(Date.now()-10000);
    assert.equal((await request('POST','/submit',{answers:'["1"]'})).status,200);assert.equal(lastUpdate.$set.grade,undefined);assert.equal(lastUpdate.$set.quizReviewStatus,'queued');
    work.deadline=new Date(Date.now()-1000);assert.equal((await request('POST','/submit',{answers:'["1"]'})).status,200);assert.equal(lastUpdate.$set.grade,undefined);assert.deepEqual(lastUpdate.$set.answers,['0']);
    work.submittedAt=new Date();assert.equal((await request('POST','/submit',{answers:'["1"]'})).status,200);
    assert.equal((await request('PATCH',`/grade/${workId}`,{grade:2})).status,403);
    role='teacher';activity.kind='assignment';assert.equal((await request('PATCH',`/grade/${workId}`,{grade:3})).status,400);assert.equal((await request('PATCH',`/grade/${workId}`,{grade:1,feedback:'Reviewed'})).status,200);
    assigned=false;assert.equal((await request('PATCH',`/grade/${workId}`,{grade:1})).status,404);
    assigned=true;role='student';activity.kind='assignment';
    const form=new FormData();form.append('files',new Blob(['My answer'],{type:'text/plain'}),'answer.txt');
    assert.equal((await request('POST','/submit',form)).status,201);assert.equal(String(created.studentId),String(studentId));assert.equal(created.attachments[0].data.toString(),'My answer');
    const invalid=new FormData();invalid.append('files',new Blob(['not a PNG'],{type:'image/png'}),'fake.png');assert.equal((await request('POST','/submit',invalid)).status,400);
    const own=await request('GET',`/files/${fileId}?workId=${workId}`);assert.equal(own.status,200);assert.equal(await own.text(),'My answer');
    assert.equal((await request('GET',`/files/${fileId}?workId=${new Types.ObjectId()}`)).status,404);
    activity.dueAt=new Date(Date.now()-1000);assert.equal((await request('POST','/submit',{text:'Late work'})).status,409);
  } finally {(marking as any).gradeAssignedWork=oldGrade;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));User.findById=old.user;Student.findOne=old.student;Teacher.findOne=old.teacher;AcademicYear.findOne=old.year;Enrollment.findOne=old.enrollment;Course.findOne=old.course;CourseActivity.findById=old.activity;CourseWork.findOne=old.work;CourseWork.findOneAndUpdate=old.update;CourseWork.create=old.create;}
});
