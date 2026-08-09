'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path='workflows/WF-013/WF-013_Chapter_Context_Assembly_v1.0.json';
const wf=JSON.parse(fs.readFileSync(path));
const node=n=>wf.nodes.find(x=>x.name===n);
for(const n of wf.nodes.filter(n=>n.type==='n8n-nodes-base.code')) new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
async function runCode(name,input){const src=node(name).parameters.jsCode;const context={structuredClone,console,$input:{first:()=>({json:input}),all:()=>[{json:input}]}};return await vm.runInNewContext(`(async()=>{${src}})()`,context);}
function base(){return {schema_version:'1.0',operation:'build_chapter_context',novel:{novel_id:'NOVEL001',novel_name:'被退婚後，我覺醒神級宗門系統'},chapter:{next_chapter_no:184,next_chapter_id:'NOVEL001-0184'},storage:{workspace_folder_id:'1irLJ9yQPpa-LqMzi3uBqQAcRMjcKmZ1P',workspace_version:'v001'},knowledge:{'StoryBible.json':{found:true,valid:true,value:{title:'Bible'}},'Canon.json':{found:true,valid:true,value:{facts:[]}},'Characters.json':{found:true,valid:true,value:[]},'World.json':{found:true,valid:true,value:[]},'Timeline.json':{found:true,valid:true,value:[]},'Conflicts.json':{found:true,valid:true,value:[]},'KnowledgeIndex.json':{found:true,valid:true,value:{canon_count:1}}},sheets:{'Chapter Database':[],'Story Progress':[],'Foreshadowing Database':[],'Foreshadowing History':[],'Chapter Plan':[]}}}
(async()=>{
 const valid=(await runCode('Validate Context Input',base()))[0].json; assert.equal(valid.chapter.next_chapter_no,184);
 let out=(await runCode('Build Chapter Context',base()))[0].json;
 assert.equal(out.ok,true); assert.equal(out.chapter_context.next_chapter_no,184); console.log('TEST A PASS');
 assert.equal(JSON.stringify(out.story_progress),JSON.stringify({main_story:{},active_threads:[],active_characters:[],active_factions:[],key_items:[],constraints:[]})); console.log('TEST B PASS');
 for(const k of ['must_consider','relevant','background','dormant','history']) assert.equal(JSON.stringify(out.foreshadowing_context[k]),'[]'); console.log('TEST C PASS');
 assert.equal(out.planning_memory.previous_plan,null);assert.equal(JSON.stringify(out.planning_memory.short_horizon_preview),'[]');console.log('TEST D PASS');
 assert.equal(out.canon_context.knowledge_health.canon_count,1); assert.equal(JSON.stringify(out.canon_context.relevant_characters),'[]'); console.log('TEST E PASS');
 let f=base();f.knowledge['Characters.json']={found:false,valid:false,value:[]};out=(await runCode('Build Chapter Context',f))[0].json;assert(out.context_meta.missing_sources.includes('Characters.json'));assert(out.context_meta.warnings.some(w=>w.file_name==='Characters.json'));console.log('TEST F PASS');
 let g=base();g.knowledge['StoryBible.json']={found:false,valid:false,value:{}};out=(await runCode('Build Chapter Context',g))[0].json;assert.equal(out.ok,true);assert(out.context_meta.warnings.some(w=>w.file_name==='StoryBible.json'&&w.severity==='high'));console.log('TEST G PASS');
 let h=base();h.storage.workspace_folder_id='';let threw=false;try{await runCode('Validate Context Input',h)}catch(e){threw=/workspace_folder_id is required/.test(String(e))}assert(threw);console.log('TEST H PASS');
 const forbidden=/append|update|delete|create|openai|gemini|claude|telegram/i; for(const n of wf.nodes){assert(!forbidden.test(n.name),`forbidden node ${n.name}`);if(n.type.includes('googleDrive'))assert(['search','download'].includes(n.parameters.operation));if(n.type.includes('googleSheets'))assert.equal(n.parameters.operation,'read');} assert.equal(wf.active,false);console.log('STRUCTURE PASS');
})().catch(e=>{console.error(e);process.exit(1)});
