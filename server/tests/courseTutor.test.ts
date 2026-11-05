import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { chunks, groundedAnswer, searchPipeline, indexMaterial, askTutor, vectorDefinition } from '../src/services/courseTutor';
import { CourseActivity } from '../src/models/CourseActivity';
import { TutorSource, TutorChunk } from '../src/models/TutorContent';
import { env } from '../src/config/env';
import * as embeddings from '../src/services/localEmbeddings';
test('PDF extraction preserves page numbers for tutor citations',async()=>{
  const stream='BT /F1 12 Tf 50 700 Td (Plants use sunlight to make food.) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const {PDFParse}=await import('pdf-parse');const parser=new PDFParse({data:new Uint8Array(Buffer.from(pdf))});try{const result=await parser.getText();assert.equal(result.pages[0].num,1);assert.match(result.pages[0].text,/Plants use sunlight/);}finally{await parser.destroy();}
});
test('retrieval is prefiltered by course and citations require exact source quotes',()=>{
  assert.equal(vectorDefinition.fields[0].numDimensions,embeddings.EMBEDDING_DIMENSIONS);
  const id=String(new Types.ObjectId());const pipeline=searchPipeline(id,[1]);assert.equal(String(pipeline[0].$vectorSearch.filter.courseId),id);assert.equal(pipeline[0].$vectorSearch.filter.model,embeddings.EMBEDDING_MODEL);
  const source={_id:'source1',activityId:'material1',title:'Lecture',text:'Plants use sunlight to make food.'};
  assert.equal(groundedAnswer({answer:'Plants use sunlight.',citations:[{id:'source1',quote:'Plants use sunlight'}]},[source]).sources.length,1);
  assert.equal(groundedAnswer({answer:'Invented',citations:[{id:'another-course',quote:'Plants use sunlight'}]},[source]).sources.length,0);
  assert.equal(groundedAnswer({answer:'Invented',citations:[{id:'source1',quote:'This is a made-up quotation'}]},[source]).sources.length,0);
  assert.equal(groundedAnswer({answer:'Uncited',citations:[]},[source]).sources.length,0);
  const parts=chunks('x'.repeat(4000));assert.ok(parts.every(p=>p.length<=450));assert.equal(parts[0].slice(-100),parts[1].slice(0,100));assert.deepEqual(chunks(' \n '),[]);
});
test('Groq receives only current course passages and rate limits return a safe error',async()=>{
  const old={aggregate:TutorChunk.aggregate,find:TutorSource.find,materials:CourseActivity.find,embed:embeddings.embed,fetch:global.fetch,key:env.GROQ_API_KEY};
  const courseId=String(new Types.ObjectId());
  const source={_id:'source1',activityId:'material1',courseId,revision:'current',score:0.9,title:'Lecture',text:'Plants use sunlight to make food.'};
  let limited=false;
  env.GROQ_API_KEY='test-key';
  (embeddings as any).embed=async()=>[Array(384).fill(0.1)];
  (TutorChunk as any).aggregate=async()=>[source,{...source,_id:'foreign',courseId:String(new Types.ObjectId())},{...source,_id:'stale',revision:'old'}];
  (TutorSource as any).find=(query:any)=>{assert.equal(query.embeddingModel,embeddings.EMBEDDING_MODEL);return {lean:async()=>[{activityId:'material1',revision:'current'}]};};
  (CourseActivity as any).find=()=>({select:()=>({lean:async()=>[{_id:'material1'}]})});
  global.fetch=(async(url:any,init:any)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(init.headers.Authorization,'Bearer test-key');
    const body=JSON.parse(init.body);
    assert.equal(body.model,env.GROQ_CHAT_MODEL);
    assert.deepEqual(JSON.parse(body.messages[1].content).excerpts,[{id:'source1',text:source.text}]);
    return limited?new Response('{}',{status:429}):new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'Plants use sunlight.',citations:[{id:'source1',quote:'Plants use sunlight'}]})}}]}),{status:200});
  }) as any;
  try{
    const answer=await askTutor(courseId,'How do plants make food?');assert.equal(answer.sources.length,1);
    limited=true;await assert.rejects(askTutor(courseId,'How do plants make food?'),/quota or rate limit/);
  }finally{TutorChunk.aggregate=old.aggregate;TutorSource.find=old.find;CourseActivity.find=old.materials;(embeddings as any).embed=old.embed;global.fetch=old.fetch;env.GROQ_API_KEY=old.key;}
});
test('indexing stores course-scoped embeddings and leaves a retryable failure on provider errors',async()=>{
  const old={find:CourseActivity.findOne,exists:CourseActivity.exists,update:TutorSource.updateOne,lock:TutorSource.findOneAndUpdate,insert:TutorChunk.insertMany,remove:TutorChunk.deleteMany,embed:embeddings.embed,key:env.GROQ_API_KEY};
  const activityId=String(new Types.ObjectId()),courseId=String(new Types.ObjectId());let inserted:any[]=[];let status='';let fail=false;
  env.GROQ_API_KEY='test-key';
  (CourseActivity as any).findOne=(query:any)=>{assert.equal(query.kind,'material');assert.equal(query.courseId,courseId);return {select:async()=>({title:'Notes',body:'Plants use sunlight to make food.',attachments:[]})};};
  (CourseActivity as any).exists=async()=>true;
  (TutorSource as any).updateOne=async(_:any,update:any)=>{if(update.$set?.status)status=update.$set.status;return {modifiedCount:1};};
  (TutorSource as any).findOneAndUpdate=async()=>({_id:'lock'});
  (TutorChunk as any).insertMany=async(rows:any[])=>{inserted=rows;};
  (TutorChunk as any).deleteMany=async()=>({deletedCount:0});
  (embeddings as any).embed=async()=>{if(fail)throw new Error('Local model unavailable');return [Array(384).fill(0.1)];};
  try{const result=await indexMaterial(activityId,courseId);assert.equal(result.chunks,1);assert.equal(inserted[0].courseId,courseId);assert.equal(inserted[0].activityId,activityId);assert.equal(inserted[0].embedding.length,384);assert.equal(status,'ready');fail=true;await assert.rejects(indexMaterial(activityId,courseId));assert.equal(status,'failed');}
  finally{CourseActivity.findOne=old.find;CourseActivity.exists=old.exists;TutorSource.updateOne=old.update;TutorSource.findOneAndUpdate=old.lock;TutorChunk.insertMany=old.insert;TutorChunk.deleteMany=old.remove;(embeddings as any).embed=old.embed;env.GROQ_API_KEY=old.key;}
});
