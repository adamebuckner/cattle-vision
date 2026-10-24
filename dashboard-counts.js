(function(){
const SPECIAL=new Set(['Livestock Guardian Dog','Horse']);
const CLASS_MAP={Cows:'Cow',Cow:'Cow',Calves:'Calf',Calf:'Calf',Heifers:'Heifer',Heifer:'Heifer',Bulls:'Bull',Bull:'Bull',Steers:'Steer',Steer:'Steer'};
let cloudHeadcounts=[];
function key(s){return String(s||'').trim().toLowerCase()}
function herd(){return typeof cattle!=='undefined'&&Array.isArray(cattle)?cattle:[]}
let weaningRows=[];
const ownGroup=a=>window.cvHerdGroup?window.cvHerdGroup(a):(a.sex==='Cow'?'females':a.sex==='Bull'?'sires':'otherYoung');
const ownCattle=()=>herd().filter(a=>!SPECIAL.has(a.sex));
function prepareCards(){
  const stats=document.querySelector('.stats'),young=document.querySelector('[data-herd-view="young"],[data-herd-view="weaned"]');if(!stats||!young)return;
  const set=(card,view,ico,title,sub,id)=>{
    card.dataset.herdView=view;card.setAttribute('onclick',"setHerdView('"+view+"')");card.onclick=()=>window.setHerdView?.(view);
    card.querySelector('.ico').textContent=ico;card.querySelector('strong').textContent=title;card.querySelector('small').textContent=sub;card.querySelector('b').id=id;
  };
  set(young,'weaned','WEANED','Weaned Calves — Recorded','Individual animals only • tap to see records','calfN');
  const all=document.querySelector('[data-herd-view="all"]');if(all){all.querySelector('strong').textContent='Tracked Cattle Records';all.querySelector('small').textContent='Each animal once • excludes batch-only entries'}
  const cows=document.querySelector('[data-herd-view="females"]');if(cows){cows.querySelector('strong').textContent='Mature Cow Records';cows.querySelector('small').textContent='Does not include heifers'}
  const sires=document.querySelector('[data-herd-view="sires"]');if(sires)sires.querySelector('strong').textContent='Bulls';
  function addCard(id,view,ico,title,sub){if(document.getElementById(id))return;const card=young.cloneNode(true);set(card,view,ico,title,sub,id);card.querySelector('b').textContent='0';card.setAttribute('aria-pressed','false');stats.appendChild(card)}
  addCard('replacementN','replacement','HEIFERS','Replacement / Growing Heifers','Not producing • tap to review');
  addCard('otherYoungN','otherYoung','FEEDERS','Other Calves / Feeders','Outside recorded weaned lots');
  addCard('breedingHerdN','breedingHerd','BREEDING','Mature Cows + Bulls','Excludes heifers and calves');
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
  const totals={all:animals.length,females:0,sires:0,replacement:0,weaned:0,otherYoung:0,breedingHerd:0};
  animals.forEach(a=>{const g=ownGroup(a);if(Object.prototype.hasOwnProperty.call(totals,g))totals[g]++});
  totals.breedingHerd=totals.females+totals.sires;
  for(const [k,id] of Object.entries({all:'totalN',females:'cowN',sires:'bullN',replacement:'replacementN',weaned:'calfN',otherYoung:'otherYoungN',breedingHerd:'breedingHerdN'})){const el=document.getElementById(id);if(el)el.textContent=String(totals[k]||0)}
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
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'[]');if(Array.isArray(cached)){weaningRows=cached;paintWeaning()}}catch{}
    const client=window.supabase.createClient('https://rtyiqggxruwejqqyqtmv.supabase.co','sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data:session}=await client.auth.getSession();if(!session?.session)return;
    const [headResult,weanResult]=await Promise.all([
      client.rpc('get_field_headcounts',{p_farm_id:farmId}),
      client.from('herd_work_events').select('event_date,description,animal_count,animal_class').eq('farm_id',farmId).eq('description','Weaning').order('event_date',{ascending:true})
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
  }catch(e){console.warn('Field counts or weaning ledger could not refresh.',e)}
  paint();
}

function install(){prepareCards();paint();installPastureCounts();loadCloud();window.addEventListener('cv-local-change',()=>setTimeout(loadCloud,250));window.addEventListener('online',loadCloud);window.cvRefreshFieldHeadcounts=loadCloud;const old=window.render;if(typeof old==='function'&&!old.__cvDashboardCounts){const wrapped=async function(){const r=await old.apply(this,arguments);paint();return r};Object.assign(wrapped,old);wrapped.__cvDashboardCounts=true;window.render=wrapped}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
