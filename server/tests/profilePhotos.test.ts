import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import sharp from 'sharp';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { Teacher } from '../src/models/Teacher';
import studentRoutes from '../src/routes/studentPortal.routes';
import teacherRoutes from '../src/routes/teacherProfile.routes';
import { generateAccessToken } from '../src/utils/tokens';
import { errorHandler } from '../src/middleware/errorHandler';
test('self-service photos update only the signed-in profile and preserve existing photos on text-only saves',async()=>{
 const old={user:User.findById,writeUser:User.updateOne,student:Student.findOne,writeStudent:Student.findOneAndUpdate,writeTeacher:Teacher.findOneAndUpdate};
 const userId=new Types.ObjectId(),studentId=new Types.ObjectId();let role='student';let changes:any;
 (User as any).findById=()=>({select:async()=>({_id:userId,role,isActive:true,name:'Test',email:'test@example.test'})});
 (User as any).updateOne=async(filter:any)=>{assert.equal(String(filter._id),String(userId));return {};};
 (Student as any).findOne=()=>({select:async()=>({_id:studentId})});
 const write=(filter:any,update:any)=>{assert.equal(String(filter.userId),String(userId));changes=update.$set;return {select:async()=>changes};};
 (Student as any).findOneAndUpdate=write;(Teacher as any).findOneAndUpdate=write;
 const app=express();app.use(express.json());app.use('/student',studentRoutes);app.use('/teacher',teacherRoutes);app.use(errorHandler);const server=app.listen(0,'127.0.0.1');
 try{await new Promise<void>(r=>server.once('listening',r));const addr=server.address();assert.ok(addr&&typeof addr!=='string');const token=generateAccessToken({_id:String(userId),role:'student',name:'Test',email:'test@example.test'});
 const request=(path:string,body:any)=>fetch(`http://127.0.0.1:${addr.port}${path}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});
 const image=await sharp({create:{width:20,height:20,channels:3,background:'#123456'}}).png().toBuffer();
 for(const nextRole of ['student','teacher']){role=nextRole;const form=new FormData();form.append('name','New Name');form.append('photo',new Blob([new Uint8Array(image)],{type:'image/png'}),'portrait.png');assert.equal((await request(`/${role}/profile`,form)).status,200);assert.match(changes.photo,/^data:image\/webp;base64,/);assert.equal((await request(`/${role}/profile`,{phone:'123'})).status,200);assert.equal('photo' in changes,false);assert.equal((await request(`/${role}/profile`,{userId:String(new Types.ObjectId())})).status,400);}
 role='parent';assert.equal((await request('/teacher/profile',{phone:'123'})).status,403);assert.equal((await request('/student/profile',{phone:'123'})).status,403);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));User.findById=old.user;User.updateOne=old.writeUser;Student.findOne=old.student;Student.findOneAndUpdate=old.writeStudent;Teacher.findOneAndUpdate=old.writeTeacher;}
});
