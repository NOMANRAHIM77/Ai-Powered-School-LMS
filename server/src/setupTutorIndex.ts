import mongoose from 'mongoose';
import { env } from './config/env';
import { TutorChunk } from './models/TutorContent';
import { vectorDefinition } from './services/courseTutor';
(async()=>{try{await mongoose.connect(env.MONGODB_URI);await TutorChunk.createCollection();const existing=await TutorChunk.collection.listSearchIndexes(env.AI_VECTOR_INDEX).toArray();if(existing.length){console.log('Index already exists; verify its definition in Atlas.');return;}await TutorChunk.collection.createSearchIndex({name:env.AI_VECTOR_INDEX,type:'vectorSearch',definition:vectorDefinition});console.log('Index requested. Wait until Atlas reports it queryable before asking questions.');}finally{await mongoose.disconnect();}})().catch(()=>{console.error('Could not create tutor index. Check Atlas connectivity and Search Index permissions.');process.exitCode=1;});
