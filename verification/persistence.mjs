import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
const base='http://localhost:3000';
const state='/tmp/courtside-persistence-test.json';
async function req(path,method='GET',body,cookie=''){
 const r=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
 const json=await r.json();assert.equal(r.ok,true,JSON.stringify(json));return {json,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};
}
if(process.argv[2]==='prepare'){
 const first=await req('/api/events');assert.equal(first.json.events.length,0,'Final pilot database must start empty');
 const data={title:'Persistence check sample',sport:'Beach volleyball',venue:'Fictional test venue',starts:new Date(Date.now()+86400000).toISOString(),capacity:1,description:'Fictional verification sample, no real event.',access:'Interest only, no seat reservation.'};
 const created=await req('/api/events','POST',data,first.cookie);
 await req('/api/events','PATCH',{id:created.json.id,action:'publish'},first.cookie);
 await req('/api/rsvp','POST',{event:created.json.id,role:'play',action:'join',name:'Test'},first.cookie);
 await req('/api/rsvp','POST',{event:created.json.id,role:'watch',action:'join',name:'Test'},first.cookie);
 await writeFile(state,JSON.stringify({cookie:first.cookie,id:created.json.id}),{mode:0o600});
 console.log('PREPARED: fresh database, event, player and spectator records saved.');
}else{
 const saved=JSON.parse(await readFile(state,'utf8'));const after=await req('/api/events','GET',undefined,saved.cookie);
 const e=after.json.events.find(e=>e.id===saved.id);assert.ok(e);assert.equal(e.players,1);assert.equal(e.spectators,1);assert.equal(e.myPlay,'confirmed');assert.equal(e.myWatch,'confirmed');assert.equal(e.mine,1);
 await req('/api/events','PATCH',{id:saved.id,action:'cancel'},saved.cookie);
 const publicView=await req('/api/events');assert.equal(publicView.json.events.length,0);
 console.log('PASS: event ownership and both RSVP lanes survived server restart. Verification sample cancelled, fresh visitor discovery empty.');
}
