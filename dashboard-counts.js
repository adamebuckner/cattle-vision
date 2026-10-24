(function(){
const SPECIAL=new Set(['Livestock Guardian Dog','Horse']);
const CLASS_MAP={Cows:'Cow',Cow:'Cow',Calves:'Calf',Calf:'Calf',Heifers:'Heifer',Heifer:'Heifer',Bulls:'Bull',Bull:'Bull',Steers:'Steer',Steer:'Steer'};
let cloudHeadcounts=[];
function key(s){return String(s||'').trim().toLowerCase()}
function herd(){return typeof cattle!=='undefined'&&Array.isArray(cattle)?cattle:[]}
let weaningRows=[];
let inventoryRows=[];
const INVENTORY_CLASSES={'Mature Cows':'females','Replacement Heifers':'replacement','Weaned Calves':'weaned','Bulls':'sires','June–October Calves':'lateCalves','Dry Cows (subset)':'dryCows','Recently Calved Cows (subset)':'recentlyCalvedCows'};
function reportedInventory(){
  const rows=inventoryRows.slice().sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const values={};
  for(const row of rows){
    const group=INVENTORY_CLASSES[row.animal_class];
    const count=Number(row.animal_count);
    if(group && !Object.prototype.hasOwnProperty.call(values,group) && Number.isSafeInteger(count) && count>=0)values[group]=count;
  }
  return values;
}
const ownGroup=a=>window.cvHerdGroup?window.cvHerdGroup(a):(a.sex==='Cow'?'females':a.sex==='Bull'?'sires':'otherYoung');
const ownCattle=()=>herd().filter(a=>!SPECIAL.has(a.sex));
function prepareCards(){
  const stats=document.querySelector('.stats'),young=document.querySelector('[data-herd-view="young"],[data-herd-view="weaned"]');if(!stats||!young)return;
  const set=(card,view,ico,title,sub,id)=>{
    card.dataset.herdView=view;card.setAttribute('onclick',"setHerdView('"+view+"')");card.onclick=()=>window.setHerdView?.(view);
    card.querySelector('.ico').textContent=ico;card.querySelector('strong').textContent=title;card.querySelector('small').textContent=sub;card.querySelector('b').id=id;
  };
  set(young,'weaned','WEANED','Weaned Calves — Recorded','Individual animals only • tap to see records','calfN');
  const all=document.querySelector('[data-herd-view="all"]');if(all){all.querySelector('strong').textContent='Reported Farm Inventory';all.querySelector('small').textContent='Five main cattle groups • tap for individual records'}
  const cows=document.querySelector('[data-herd-view="females"]');if(cows){cows.querySelector('strong').textContent='Mature Cow Records';cows.querySelector('small').textContent='Does not include heifers'}
  const sires=document.querySelector('[data-herd-view="sires"]');if(sires)sires.querySelector('strong').textContent='Bulls';
  function addCard(id,view,ico,title,sub){if(document.getElementById(id))return;const card=young.cloneNode(true);set(card,view,ico,title,sub,id);card.querySelector('b').textContent='0';card.setAttribute('aria-pressed','false');stats.appendChild(card)}
  addCard('replacementN','replacement','HEIFERS','Replacement / Growing Heifers','Not producing • tap for entered records');
  addCard('lateCalvesN','lateCalves','CALVES','June–October Calves','Reported births • individual records may be incomplete');
  addCard('otherYoungN','otherYoung','FEEDERS','Other Calves / Feeders','Outside recorded weaned lots');
  addCard('breedingHerdN','breedingHerd','BREEDING','Mature Cows + Bulls','Reported mature cows and bulls, not replacements');
  if(!document.getElementById('cvInventorySummary')){
    const panel=document.createElement('section');panel.id='cvInventorySummary';panel.className='panel';
    panel.style.cssText='margin:10px 0;padding:12px;';
    stats.insertAdjacentElement('afterend',panel);
  }
  if(!document.getElementById('cvWeaningLedger')){
    const panel=document.createElement('section');panel.id='cvWeaningLedger';panel.className='panel';
    panel.style.cssText='margin:10px 0;padding:12px;';
    stats.insertAdjacentElement('afterend',panel);
  }
}
function paintWeaning(){
  const panel=document.getElementById('cvWeaningLedger');if(!panel)return;
  const y=new Date().getFullYear(),rows=weaningRows.filter(r=>String(r.event_date||'').startsWith(String(y)));
  const total=rows.reduce((n,r)=>n+(Number(r.animal_count)||0),0);
  const tagged=ownCattle().filter(a=>ownGroup(a)==='weaned').length;
  const unlinked=Math.max(0,total-tagged);
  const potentialTypeErrors=ownCattle().filter(a=>a.sex==='Cow'&&Number.isFinite(Date.parse(a.birth||''))&&Date.parse(a.birth)<=Date.now()&&Date.now()-Date.parse(a.birth)<365*86400000);
  const dates=rows.slice().sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))).map(r=>`${String(r.event_date||'')} — ${Number(r.animal_count)||0} head`).join(' • ');
  panel.innerHTML='<strong>Weaning batch ledger ('+y+')</strong><p style="margin:6px 0"><b>'+total+' batch-reported weaned calves</b> • '+tagged+' individual records in weaned lots'+(total?' • '+unlinked+' batch heads not yet matched to individual weaned-lot records':'')+'</p><small>'+ (dates||'No batch ledger loaded from the cloud for this year.')+'</small><p class="muted" style="margin:6px 0 0">Batch totals are separate from the individual-cattle record total. Do not add the two totals together without reconciling tags and lots.</p>'+(potentialTypeErrors.length?'<p style="margin:6px 0;color:#a15d13"><b>Classification to review:</b> '+potentialTypeErrors.length+' cow-typed record(s) under one year old, excluded from mature cows until corrected. Tags: '+potentialTypeErrors.map(a=>String(a.tag||'N-T').replace(/[&<>"']/g,'')).join(', ')+'</p>':'');
}
function latestOverrides(){
  const latest=new Map();
  for(const e of cloudHeadcounts){const type=CLASS_MAP[e.animal_class];if(!type||!Number.isFinite(Number(e.animal_count)))continue;const pasture=key(e.pasture_name||e.pasture_id||'unassigned'),k=pasture+'|'+type;if(!latest.has(k))latest.set(k,Number(e.animal_count))}
  return latest;
}
function effectiveByPasture(){
  const by=new Map();
  for(const a of herd().filter(a=>!SPECIAL.has(a.sex))){const type=a.sex||'Cow',pasture=key(a.location||'unassigned'),k=pasture+'|'+type;by.set(k,(by.get(k)||0)+1)}
  for(const [k,n] of latestOverrides())by.set(k,n);
  return by;
}
function effectiveCounts(){
  const out={Cow:0,Bull:0,Calf:0,Heifer:0,Steer:0,total:0};
  for(const [k,n] of effectiveByPasture()){const type=k.slice(k.lastIndexOf('|')+1);out[type]=(out[type]||0)+n;out.total+=n}
  return out;
}
function paint(){
  prepareCards();
  const animals=ownCattle();
  const tagged={all:animals.length,females:0,sires:0,replacement:0,weaned:0,lateCalves:0,otherYoung:0,breedingHerd:0};
  animals.forEach(a=>{const g=ownGroup(a);if(Object.prototype.hasOwnProperty.call(tagged,g))tagged[g]++});
  tagged.breedingHerd=tagged.females+tagged.sires;
  const reported=reportedInventory();
  const main=['females','sires','replacement','weaned','lateCalves'];
  const hasAll=main.every(k=>Object.prototype.hasOwnProperty.call(reported,k));
  if(Object.prototype.hasOwnProperty.call(reported,'females')&&Object.prototype.hasOwnProperty.call(reported,'sires'))reported.breedingHerd=reported.females+reported.sires;
  if(hasAll)reported.all=main.reduce((n,k)=>n+reported[k],0);
  window.cvReportedInventory={...reported};
  const displayed={...tagged,...reported};
  for(const [k,id] of Object.entries({all:'totalN',females:'cowN',sires:'bullN',replacement:'replacementN',weaned:'calfN',lateCalves:'lateCalvesN',otherYoung:'otherYoungN',breedingHerd:'breedingHerdN'})){
    const node=document.getElementById(id);if(node)node.textContent=String(displayed[k]??0);
  }
  const summary=document.getElementById('cvInventorySummary');
  if(summary){
    const categories=[['females','Mature cows'],['sires','Bulls'],['replacement','Replacement / growing heifers'],['weaned','Weaned calves'],['lateCalves','June–October births (verify present)']];
    const cells=categories.map(([k,label])=>{
      const actual=Object.prototype.hasOwnProperty.call(reported,k)?reported[k]:null;
      const seen=tagged[k]||0;
      const unmatched=actual===null?null:Math.max(0,actual-seen);
      return '<div style="flex:1 1 140px;padding:6px 0"><div class="muted">'+label+'</div><b style="font-size:20px">'+(actual===null?'—':actual)+'</b><div style="font-size:12px">'+seen+' individual record'+(seen===1?'':'s')+(unmatched!==null?' • '+unmatched+' without matching individual records':'')+'</div></div>';
    }).join('');
    const subset=Object.prototype.hasOwnProperty.call(reported,'dryCows')&&Object.prototype.hasOwnProperty.call(reported,'recentlyCalvedCows')
      ?'<div style="margin-top:6px">Of the <b>80 additional mature cows</b>: <b>'+reported.recentlyCalvedCows+' recently calved</b> and <b>'+reported.dryCows+' dry</b>. Both subsets are already included in the mature-cow count.</div>'
      :'';
    const subtotal=hasAll?reported.all:null;
    const confirmed=hasAll?reported.females+reported.sires+reported.replacement+reported.weaned:null;
    summary.innerHTML='<strong>Reported farm inventory — distinct cattle groups</strong><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">'+cells+'</div>'
      +(subtotal===null?'':'<div style="margin-top:7px"><b>'+subtotal+' head in these five groups (provisional)</b> • '+confirmed+' excluding June–October calves until live headcount verified</div>')
      +subset
      +'<p class="muted" style="margin:6px 0 0">The 55 recent calvings are separate from the 291 weaned calves; confirm how many recent calves are alive and still present. Do not add the dry/calved cow subsets twice. Pasture and other feeder cattle may not all be reconciled to these groups. The individual-record total is '+tagged.all+', and taps show only entered animal records.</p>';
  }
  paintWeaning();
}

function pastureClassCounts(){
  const out=new Map(),ensure=p=>{if(!out.has(p))out.set(p,{total:0,cows:0,calves:0,heifers:0,bulls:0,steers:0,dogs:0,horses:0,authoritative:false});return out.get(p)};
  for(const a of herd()){const p=key(a.location);if(!p)continue;const c=ensure(p);if(a.sex==='Livestock Guardian Dog'){c.dogs++;continue}if(a.sex==='Horse'){c.horses++;continue}c.total++;if(a.sex==='Cow')c.cows++;else if(a.sex==='Calf')c.calves++;else if(a.sex==='Heifer')c.heifers++;else if(a.sex==='Bull')c.bulls++;else if(a.sex==='Steer')c.steers++}
  const fields={Cow:'cows',Calf:'calves',Heifer:'heifers',Bull:'bulls',Steer:'steers'};
  for(const e of cloudHeadcounts){const type=CLASS_MAP[e.animal_class],field=fields[type],p=key(e.pasture_name);if(!field||!p)continue;const c=ensure(p),old=c[field]||0,n=Number(e.animal_count)||0;c[field]=n;c.total+=n-old;c.authoritative=true}
  return out;
}
function countText(c){
  const parts=[];if(c.cows)parts.push(`${c.cows} cow${c.cows===1?'':'s'}`);if(c.calves)parts.push(`${c.calves} ${c.calves===1?'calf':'calves'}`);if(c.heifers)parts.push(`${c.heifers} heifer${c.heifers===1?'':'s'}`);if(c.bulls)parts.push(`${c.bulls} bull${c.bulls===1?'':'s'}`);if(c.steers)parts.push(`${c.steers} steer${c.steers===1?'':'s'}`);if(!parts.length)parts.push(`${c.total||0} cattle`);if(c.dogs)parts.push(`${c.dogs} guardian dog${c.dogs===1?'':'s'}`);if(c.horses)parts.push(`${c.horses} horse${c.horses===1?'':'s'}`);return (c.authoritative?'Field-reported counts • ':'')+parts.join(' • ')
}
function installPastureCounts(){
  window.cvFieldHeadcounts=cloudHeadcounts.slice();
  window.cvEffectivePastureCounts=pastureClassCounts;
  if(typeof window.pastureCounts==='function'&&!window.pastureCounts.__cvFieldAware){const f=function(){return pastureClassCounts()};f.__cvFieldAware=true;window.pastureCounts=f}
  if(typeof window.pastureCountText==='function'&&!window.pastureCountText.__cvFieldAware){const f=function(c){return countText(c||{})};f.__cvFieldAware=true;window.pastureCountText=f}
  try{window.renderPastureCounts?.();const modal=document.getElementById('pastureModal');if(modal&&!modal.classList.contains('hidden'))window.renderPastureManager?.(false)}catch(e){console.warn('Pasture counts did not repaint',e)}
}
async function loadCloud(){
  paint();
  try{
    if(!window.supabase?.createClient)return;
    const farmId=localStorage.getItem('cv2-cloud-farm-id');if(!farmId)return;
    const cacheKey='cv2-weaning-ledger-'+farmId;
    const inventoryCacheKey='cv2-herd-inventory-'+farmId;
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'[]');if(Array.isArray(cached)){weaningRows=cached;paintWeaning()}}catch{}
    try{const cached=JSON.parse(localStorage.getItem(inventoryCacheKey)||'[]');if(Array.isArray(cached)){inventoryRows=cached;paint()}}catch{}
    const client=window.supabase.createClient('https://rtyiqggxruwejqqyqtmv.supabase.co','sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data:session}=await client.auth.getSession();if(!session?.session)return;
    const [headResult,weanResult,inventoryResult]=await Promise.all([
      client.rpc('get_field_headcounts',{p_farm_id:farmId}),
      client.from('herd_work_events').select('event_date,description,animal_count,animal_class').eq('farm_id',farmId).eq('description','Weaning').order('event_date',{ascending:true}),
      client.from('herd_work_events').select('event_date,animal_class,animal_count,created_at').eq('farm_id',farmId).eq('description','Herd inventory').order('event_date',{ascending:false}).limit(100)
    ]);
    if(!headResult.error){
      cloudHeadcounts=Array.isArray(headResult.data)?headResult.data:[];
      installPastureCounts();
      window.dispatchEvent(new CustomEvent('cv-field-headcounts',{detail:{rows:cloudHeadcounts.slice()}}));
    }
    if(!weanResult.error){
      weaningRows=Array.isArray(weanResult.data)?weanResult.data:[];
      try{localStorage.setItem(cacheKey,JSON.stringify(weaningRows))}catch{}
    }
    if(!inventoryResult.error){
      inventoryRows=Array.isArray(inventoryResult.data)?inventoryResult.data:[];
      try{localStorage.setItem(inventoryCacheKey,JSON.stringify(inventoryRows))}catch{}
    }
  }catch(e){console.warn('Field counts or weaning ledger could not refresh.',e)}
  paint();
}

function install(){prepareCards();paint();installPastureCounts();loadCloud();window.addEventListener('cv-local-change',()=>setTimeout(loadCloud,250));window.addEventListener('online',loadCloud);window.cvRefreshFieldHeadcounts=loadCloud;const old=window.render;if(typeof old==='function'&&!old.__cvDashboardCounts){const wrapped=async function(){const r=await old.apply(this,arguments);paint();return r};Object.assign(wrapped,old);wrapped.__cvDashboardCounts=true;window.render=wrapped}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
