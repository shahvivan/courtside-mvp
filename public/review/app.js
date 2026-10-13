'use strict';
const {fixture,reconcile,recordReview}=CourtSide;
const result=reconcile(fixture),key='courtside-review-session45-v1';
let history=[];
const $=id=>document.getElementById(id);
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function money(cents){return new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(cents/100);}
function warn(){const w=$('storage-warning');w.hidden=false;w.textContent='Browser storage is unavailable or invalid. Review works in memory; export before closing. Local-file storage behavior varies by browser.';}
try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved)||saved.length>1000)throw Error('Invalid history');for(const h of saved){if(h.fixtureId!==fixture.id||h.ruleVersion!=='v1'||typeof h.at!=='string'||Number.isNaN(Date.parse(h.at)))throw Error('Invalid record');recordReview([] ,h,h.at);}history=saved;}catch{warn();}
function persist(){try{localStorage.setItem(key,JSON.stringify(history));}catch{warn();}}
function evidence(ids,label='View sources'){
 const b=node('button',label,'evidence');b.type='button';b.addEventListener('click',()=>showSources(ids));return b;
}
function showSources(ids){
 const panel=$('source-panel');panel.replaceChildren();
 for(const id of ids){const m=fixture.messages.find(m=>m.id===id),p=fixture.payments.find(p=>p.id===id),s=node('div',undefined,'source');
  if(m){s.append(node('strong',`${m.id} · ${m.time} · ${m.name} · structured intent: ${m.intent}`),node('p',m.text));}
  else if(p){s.append(node('strong',`${p.id} · transaction ${p.tx}`),node('p',`${p.reference} · ${money(p.cents)} · ${p.time} · ${p.state}`));}
  panel.append(s);
 }
 panel.append(node('p','Source IDs refer to the fixed synthetic fixture. They do not establish real identity.','hint'));
 if(matchMedia('(max-width:760px)').matches)panel.scrollIntoView({block:'center',behavior:'auto'});
}
for(const [value,label]of[[result.totals.confirmed,'Proposed confirmed'],[result.totals.waitlist,'Waitlisted'],[result.totals.spectators,'Spectator'],[result.totals.uniqueTransactions,'Unique payments'],[money(result.totals.grossCents),'Gross received (fictional)']]){
 const d=node('div',undefined,'total');d.append(node('strong',String(value)),node('span',label));$('totals').append(d);
}
for(const row of result.rows){const tr=node('tr'),status=node('td');status.append(node('span',row.status,'status '+(row.status==='Confirmed'?'confirmed':'')));const ev=node('td');const extra=row.name==='Ben'?['m13']:[];ev.append(evidence([...row.sourceIds,...extra,...row.paymentIds]));tr.append(node('td',row.name),status,node('td',row.firstRequest),ev);$('roster').append(tr);}
$('exception-count').textContent=`${result.exceptions.length} source-linked exceptions`;
function renderExceptions(){
 $('exceptions').replaceChildren();
 for(const ex of result.exceptions){
  const section=node('article',undefined,'exception');section.append(node('h3',`${ex.id} · ${ex.name} · ${money(ex.cents)}`),node('p',ex.reason),evidence(ex.sourceIds));
  const last=history.filter(h=>h.exceptionId===ex.id).at(-1);section.append(node('p',last?`Latest review: ${last.decision}`:'Not reviewed','decision-state'));
  const form=node('form'),dl=node('label','Review decision'),select=node('select');select.name='decision';select.setAttribute('aria-label',`Decision for ${ex.id}`);
  for(const d of ['Keep unresolved','Checked source, no action needed','Organiser follow-up required'])select.append(node('option',d));dl.append(select);
  const rl=node('label','Reason · synthetic details only','reason'),reason=node('textarea');reason.name='reason';reason.required=true;reason.minLength=8;reason.maxLength=500;reason.setAttribute('aria-label',`Reason for ${ex.id}`);rl.append(reason);
  const button=node('button','Record review');button.type='submit';form.append(dl,button,rl);
  form.addEventListener('submit',event=>{event.preventDefault();try{history=recordReview(history,{exceptionId:ex.id,decision:select.value,reason:reason.value});persist();renderExceptions();renderHistory();$('feedback').textContent=`Review recorded for ${ex.id}. No allocations changed and no action was executed.`;}catch(e){$('feedback').textContent=e.message;}});
  section.append(form);$('exceptions').append(section);
 }
}
function renderHistory(){const area=$('history');area.replaceChildren();if(!history.length)area.append(node('p','No review decisions recorded yet.','hint'));for(const h of [...history].reverse()){const e=node('div',undefined,'history-entry');e.append(node('strong',`${h.exceptionId} · ${h.decision}`),node('div',h.reason),node('small',`${h.at} · ${h.fixtureId} · rules v1 · local, unverified reviewer`));area.append(e);}}
$('export').addEventListener('click',()=>{const report={exportedAt:new Date().toISOString(),synthetic:true,ruleVersion:'v1',fixtureId:fixture.id,limitations:'Local unauthenticated review log. No messages or financial actions executed.',fixture,result,reviewHistory:history};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='courtside-synthetic-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('feedback').textContent='Synthetic review JSON exported.';});
$('clear').addEventListener('click',()=>{if(!confirm('Clear local review history? Export first if you want to keep it. The fixture and roster will not change.'))return;history=[];persist();renderExceptions();renderHistory();$('feedback').textContent='Local review history cleared. The fixture is unchanged.';});
renderExceptions();renderHistory();
