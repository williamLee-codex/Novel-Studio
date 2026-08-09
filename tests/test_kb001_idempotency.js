'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const load=i=>JSON.parse(fs.readFileSync(fs.readdirSync(`workflows/WF-${String(i).padStart(3,'0')}`).filter(x=>x.endsWith('.json'))[0].replace(/^/,`workflows/WF-${String(i).padStart(3,'0')}/`),'utf8'));
const node=(d,name)=>{const n=d.nodes.find(x=>x.name===name);assert(n,`missing ${name}`);return n};
for(let i=6;i<=11;i++)for(const n of load(i).nodes.filter(x=>x.type==='n8n-nodes-base.code'))assert.doesNotThrow(()=>new vm.Script(`(async()=>{${n.parameters.jsCode}\n})`),`WF-${i} ${n.name}`);
const kb=JSON.parse(fs.readFileSync('workflows/KB-001/KB-001_Historical_Knowledge_Bootstrap_Adapter_v1.1.json','utf8'));
const kbNode=name=>node(kb,name);assert(kbNode('Load Historical Chapter Source').parameters.filtersUI.values.some(v=>v.lookupColumn==='source_status'&&v.lookupValue==='LEGACY_MASTER'));
assert(kbNode('Load Bootstrap Config').parameters.jsCode.includes('KB001_ALLOW_MULTI_CHAPTER_TEST'));
assert(kbNode('Prepare WF-011 Runtime Input').parameters.jsCode.includes('_bootstrap_context:b'));
for(const n of kb.nodes.filter(x=>['n8n-nodes-base.googleSheets','n8n-nodes-base.executeWorkflow'].includes(x.type)))assert(!n.onError,`${n.name} must stop on technical error`);
const specs=[
 [6,'Generate Canon Object',['stableId(knowledgeKey)','idempotency_key']],
 [7,'Generate Character IDs',['|character|','knowledge_key']],
 [8,'Generate World IDs',['|world|','knowledge_key']],
 [9,'Generate Timeline UUID',['|timeline|','knowledge_key']],
 [10,'Generate Story Bible UUID',['|story-bible','story_bible_knowledge_key']],
 [11,'Resolve Knowledge Root Folder',['persistence_upsert_key','idempotencyKey']],
];
for(const [i,name,needles] of specs){const code=node(load(i),name).parameters.jsCode;assert(!/Math\.random|Date\.now/.test(code),`${name} must not generate random identity`);for(const value of needles)assert(code.includes(value),`${name} missing ${value}`);}
const wf11=load(11),manifest=node(wf11,'Build Knowledge File Manifest').parameters.jsCode;assert(manifest.includes("overwrite_strategy:'upsert_exact_path'"));assert(manifest.includes('upsert_key:`${d[1]}/${d[0]}`'));
assert.equal(node(wf11,'Search Exact File').parameters.operation,'search');assert.equal(node(wf11,'Update Existing Knowledge File').parameters.operation,'update');assert.equal(node(wf11,'Create Knowledge File').parameters.operation,'upload');
const stableId=value=>{let h=2166136261;for(const ch of String(value).normalize('NFKC').toLocaleLowerCase()){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
const build=()=>({canon:new Set([`CANON-${stableId('NOVEL001|chapter|1|NOVEL001-CH-001')}`]),characters:new Set(['林淵','蘇清月'].map(x=>`CHR-${stableId(`NOVEL001|character|${x}`)}`)),world:new Set(['sect|九玄宗'].map(x=>`WLD-${stableId(`NOVEL001|world|${x}`)}`)),timeline:new Set(['1|0|退婚'].map(x=>`TML-${stableId(`NOVEL001|timeline|${x}`)}`)),storyBible:new Set([`BIB-${stableId('NOVEL001|story-bible')}`]),persistence:new Set([`KPS-${stableId('NOVEL001:chapter:1:historical-bootstrap')}`])});
const first=build(),second=build();for(const layer of Object.keys(first)){assert.deepEqual([...second[layer]],[...first[layer]],`${layer} identity changed on retry`);assert.equal(second[layer].size,first[layer].size,`${layer} count changed`);} 
console.log('KB-001 DETERMINISTIC-ID/UPSERT/RETRY STATIC PASS');
