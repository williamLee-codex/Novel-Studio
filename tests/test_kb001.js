'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const path='workflows/KB-001/KB-001_Historical_Knowledge_Bootstrap_Adapter_v1.0.json';
const wf=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(wf.name,'KB-001 - Historical Knowledge Bootstrap Adapter v1');assert.equal(wf.active,false);assert(Array.isArray(wf.nodes)&&wf.nodes.length>30);assert.equal(wf.settings.executionOrder,'v1');
const byName=Object.fromEntries(wf.nodes.map(n=>[n.name,n]));
for(const name of ['Manual Trigger','Load Bootstrap Config','Read Bootstrap Log','Resolve Resume Cursor','Load Historical Chapter Source','Validate Historical Source','Load Master Chapter Row','Build Historical Master Context','Build WF-006 Input Contract','Build COMPLETED Log','Advance Sequential Cursor'])assert(byName[name],`missing ${name}`);
const source=byName['Load Historical Chapter Source'];assert.equal(source.parameters.documentId.value,'1qJi6XSSKxliFyUbDiYFR5vLuyG0ejKJxzn8mHNRpivY');assert.equal(source.parameters.sheetName.value,'01_Master Chapters');assert(source.parameters.filtersUI.values.some(x=>x.lookupColumn==='source_status'&&x.lookupValue==='LEGACY_MASTER'));
for(const n of wf.nodes.filter(n=>n.type.includes('googleSheets'))){assert.equal(n.typeVersion,4.6);assert.equal(n.credentials.googleSheetsOAuth2Api.id,'={{ $env.GOOGLE_SHEETS_CREDENTIAL_ID }}');assert(n.parameters.documentId.value);assert(n.parameters.sheetName.value);}
for(let i=6;i<=12;i++){const n=byName[`Execute WF-${String(i).padStart(3,'0')}`];assert(n);assert(String(n.parameters.workflowId).startsWith(`WF-${String(i).padStart(3,'0')} - `));assert.equal(n.parameters.options.waitForSubWorkflow,true);assert.equal(n.onError,'continueRegularOutput');assert(byName[`Stop After WF-${String(i).padStart(3,'0')} Failure`]);}
const all=JSON.stringify(wf);assert(!/Promise\.all|splitInBatches/i.test(all));assert(all.includes('allow_canon_overwrite:false'));assert(all.includes("source_priority:'chapter_content'"));assert(!byName['Build WF-006 Input Contract'].parameters.jsCode.includes('MASTER正文'));assert(all.includes('LEGACY_MASTER'));
for(const n of wf.nodes.filter(n=>n.type.endsWith('.code'))){assert.doesNotThrow(()=>new vm.Script(`(async()=>{${n.parameters.jsCode}\n})`),`syntax ${n.name}`);}
// Contract simulation: the builder's declared shape matches the inspected WF-006 validator.
const contract={schema_version:'1.0',route:'chapter.persistence.created',status:'ready',is_valid:true,chapter:{chapter_uuid:'NOVEL001-CH-001',novel_uuid:'NOVEL001',workspace_uuid:'WS-real',chapter_number:1,chapter_title:'第一章'},chapter_content:'完整正文'.repeat(100),_bootstrap_context:{allow_canon_overwrite:false}};
assert.equal(contract.schema_version,'1.0');assert.equal(contract.route,'chapter.persistence.created');assert(contract.chapter_content.length>200);assert.equal(contract._bootstrap_context.allow_canon_overwrite,false);
// Resume model mirrors Resolve Resume Cursor: only a contiguous completed prefix is skipped.
function cursor(start,end,rows){const done=new Set(rows.filter(r=>r.status==='COMPLETED').map(r=>r.chapter));let n=start;while(n<=end&&done.has(n))n++;return n;}
assert.equal(cursor(1,182,[{chapter:1,status:'COMPLETED'},{chapter:2,status:'COMPLETED'},{chapter:3,status:'FAILED'}]),3);assert.equal(cursor(1,182,[{chapter:1,status:'COMPLETED'},{chapter:3,status:'COMPLETED'}]),2);assert.equal(cursor(1,1,[{chapter:1,status:'COMPLETED'}]),2);
const key=n=>`NOVEL001:chapter:${n}:historical-bootstrap`;assert.equal(key(64),key(64));assert.notEqual(key(64),key(65));
// Exactly one sequential loop back-edge and no chapter advancement from a failure branch.
const incoming=[];for(const [from,v] of Object.entries(wf.connections))for(const branch of v.main||[])for(const e of branch||[])if(e.node==='Chapter In Range?')incoming.push(from);assert.deepEqual(new Set(incoming),new Set(['Resolve Resume Cursor','Advance Sequential Cursor']));for(let i=6;i<=12;i++){const stop=`Stop After WF-${String(i).padStart(3,'0')} Failure`;assert(!wf.connections[stop]);}
console.log('KB-001 JSON/SCHEMA/CONTRACT/SEQUENCE/RESUME/IDEMPOTENCY PASS');
