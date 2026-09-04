(function(){
if(window.__cvGuardianStatusesInstalled)return;window.__cvGuardianStatusesInstalled=true;
const DOG='Livestock Guardian Dog';
const OPTIONS=['Working','Training','Breeding','Puppy','Retired','Companion'];
const el=id=>document.getElementById(id);
const herd=()=>typeof cattle!=='undefined'&&Array.isArray(cattle)?cattle:[];
const isDog=a=>a&&a.sex===DOG;
const dogName=a=>String(a?.tag||'').trim()||'Unnamed dog';
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function normalizeStatuses(a){
  let raw=Array.isArray(a?.guardianStatuses)?a.guardianStatuses:[];
  if(!raw.length&&a?.guardianStatus){
    const old=String(a.guardianStatus).trim();
    if(/^puppy\s*\/\s*training$/i.test(old))raw=['Puppy','Training'];
    else raw=old.split(/\s*(?:,|\||\+)\s*/).filter(Boolean);
  }
  const mapped=[];
  for(const x of raw){const s=String(x||'').trim();if(!s)continue;if(/^work(?:ing)?$/i.test(s))mapped.push('Working');else if(/^train(?:ing)?$/i.test(s))mapped.push('Training');else if(/^breed(?:ing)?$/i.test(s))mapped.push('Breeding');else if(/^puppy$/i.test(s))mapped.push('Puppy');else if(/^retired?$/i.test(s))mapped.push('Retired');else if(/^companion$/i.test(s))mapped.push('Companion');else if(/^puppy\s*\/\s*training$/i.test(s))mapped.push('Puppy','Training')}
  const out=[...new Set(mapped.filter(x=>OPTIONS.includes(x)))];
  return out.length?out:['Working'];
}
window.cvDogStatuses=normalizeStatuses;
function checklistHtml(id){return `<div id="${id}" class="dog-status-grid">${OPTIONS.map(s=>`<label class="dog-status-chip"><input type="checkbox" value="${s}"><span>${s}</span></label>`).join('')}</div>`}
function ensureChecklist(selectId,hostId){const s=el(selectId);if(!s||el(hostId))return;const lab=s.parentElement?.querySelector('label');if(lab)lab.textContent='Guardian Status — choose all that apply';s.style.display='none';s.setAttribute('aria-hidden','true');s.insertAdjacentHTML('afterend',checklistHtml(hostId))}
function setChecks(hostId,statuses){const set=new Set(statuses);el(hostId)?.querySelectorAll('input[type=checkbox]').forEach(c=>{c.checked=set.has(c.value)})}
function getChecks(hostId){const vals=[...(el(hostId)?.querySelectorAll('input[type=checkbox]:checked')||[])].map(x=>x.value);return vals.length?vals:['Working']}
function setHidden(selectId,statuses){const s=el(selectId);if(!s)return;let legacy='Working';if(statuses.includes('Puppy')&&statuses.includes('Training'))legacy='Puppy / Training';else if(['Working','Breeding','Retired','Companion'].includes(statuses[0]))legacy=statuses[0];if(![...s.options].some(o=>o.value===legacy)){const o=document.createElement('option');o.value=legacy;o.textContent=legacy;s.appendChild(o)}s.value=legacy}
function saveStatuses(a,statuses){if(!a||!isDog(a))return;const vals=[...new Set(statuses.filter(x=>OPTIONS.includes(x)))];a.guardianStatuses=vals.length?vals:['Working'];a.guardianStatus=a.guardianStatuses.join(', ')}
function ensure(){ensureChecklist('aDogStatus','aDogStatusMulti');ensureChecklist('rDogStatus','rDogStatusMulti')}
function registryHtml(){const dogs=herd().filter(isDog).sort((a,b)=>dogName(a).localeCompare(dogName(b),undefined,{numeric:true}));const count=s=>dogs.filter(d=>normalizeStatuses(d).includes(s)).length;return `<div class="dog-summary dog-summary-multi"><div><span>Total Dogs</span><b>${dogs.length}</b></div><div><span>Working</span><b>${count('Working')}</b></div><div><span>Training</span><b>${count('Training')}</b></div><div><span>Breeding</span><b>${count('Breeding')}</b></div><div><span>Puppy</span><b>${count('Puppy')}</b></div><div><span>Retired</span><b>${count('Retired')}</b></div><div><span>Companion</span><b>${count('Companion')}</b></div></div><button class="greenbtn" style="width:100%;margin-bottom:12px" onclick="closeGuardianRegistry();openOtherAnimal('${DOG}')">Add Guardian Dog</button><div class="dog-registry-list">${dogs.length?dogs.map(d=>`<button class="dog-row" type="button" onclick="closeGuardianRegistry();openRecord('${String(d.id).replace(/'/g,"\\'")}')"><span><b>🐕 ${safe(dogName(d))}</b><small>${safe(d.canineSex||'Sex unknown')}${d.breed?` • ${safe(d.breed)}`:''}${d.location?` • ${safe(d.location)}`:''}<br>${d.dam?`Dam ${safe(d.dam)}`:''}${d.dam&&d.sire?' • ':''}${d.sire?`Sire ${safe(d.sire)}`:''}</small></span><span class="dog-badges">${normalizeStatuses(d).map(s=>`<span class="dog-badge">${safe(s)}</span>`).join('')}</span></button>`).join(''):'<div class="empty">No guardian dogs saved yet.</div>'}</div>`}
function decorateRegistry(){const body=el('guardianDogRegistryBody');if(body)body.innerHTML=registryHtml()}
function install(){ensure();
  if(typeof window.openOtherAnimal==='function'&&!window.openOtherAnimal.__cvMultiStatus){const old=window.openOtherAnimal;window.openOtherAnimal=function(type){const r=old.apply(this,arguments);setTimeout(()=>{ensure();if(type===DOG){setChecks('aDogStatusMulti',['Working']);setHidden('aDogStatus',['Working'])}},0);return r};window.openOtherAnimal.__cvMultiStatus=true}
  if(typeof window.openGuardianDog==='function'&&!window.openGuardianDog.__cvMultiStatus){const old=window.openGuardianDog;window.openGuardianDog=function(){const r=old.apply(this,arguments);setTimeout(()=>{ensure();setChecks('aDogStatusMulti',['Working']);setHidden('aDogStatus',['Working'])},0);return r};window.openGuardianDog.__cvMultiStatus=true}
  if(typeof window.openAdd==='function'&&!window.openAdd.__cvMultiStatus){const old=window.openAdd;window.openAdd=function(){const r=old.apply(this,arguments);setTimeout(()=>{ensure();if(el('aSex')?.value===DOG){setChecks('aDogStatusMulti',['Working']);setHidden('aDogStatus',['Working'])}},0);return r};window.openAdd.__cvMultiStatus=true}
  if(typeof window.saveNewAnimal==='function'&&!window.saveNewAnimal.__cvMultiStatus){const old=window.saveNewAnimal;window.saveNewAnimal=async function(){const dog=el('aSex')?.value===DOG,statuses=dog?getChecks('aDogStatusMulti'):[],before=new Set(herd().map(a=>String(a.id)));if(dog)setHidden('aDogStatus',statuses);const r=await old.apply(this,arguments);if(dog){const added=herd().find(a=>!before.has(String(a.id)));if(added){saveStatuses(added,statuses);if(typeof save==='function')save();window.dispatchEvent(new Event('cv-dog-changed'))}}return r};window.saveNewAnimal.__cvMultiStatus=true}
  if(typeof window.openRecord==='function'&&!window.openRecord.__cvMultiStatus){const old=window.openRecord;window.openRecord=async function(id){const r=await old.apply(this,arguments),a=herd().find(x=>String(x.id)===String(id));setTimeout(()=>{ensure();if(isDog(a)){const statuses=normalizeStatuses(a);setChecks('rDogStatusMulti',statuses);setHidden('rDogStatus',statuses)}},0);return r};window.openRecord.__cvMultiStatus=true}
  if(typeof window.saveRecord==='function'&&!window.saveRecord.__cvMultiStatus){const old=window.saveRecord;window.saveRecord=function(){const a=herd().find(x=>String(x.id)===String(typeof currentId!=='undefined'?currentId:'')),statuses=isDog(a)?getChecks('rDogStatusMulti'):[];if(isDog(a))setHidden('rDogStatus',statuses);const r=old.apply(this,arguments);if(isDog(a)){saveStatuses(a,statuses);if(typeof save==='function')save();window.dispatchEvent(new Event('cv-dog-changed'));setTimeout(decorateRegistry,0)}return r};window.saveRecord.__cvMultiStatus=true}
  if(typeof window.savePuppy==='function'&&!window.savePuppy.__cvMultiStatus){const old=window.savePuppy;window.savePuppy=function(){const before=new Set(herd().map(a=>String(a.id))),r=old.apply(this,arguments),added=herd().find(a=>isDog(a)&&!before.has(String(a.id)));if(added){saveStatuses(added,['Puppy','Training','Working']);if(typeof save==='function')save();window.dispatchEvent(new Event('cv-dog-changed'))}return r};window.savePuppy.__cvMultiStatus=true}
  if(typeof window.openGuardianRegistry==='function'&&!window.openGuardianRegistry.__cvMultiStatus){const old=window.openGuardianRegistry;window.openGuardianRegistry=function(){const r=old.apply(this,arguments);setTimeout(decorateRegistry,0);return r};window.openGuardianRegistry.__cvMultiStatus=true}
}
// The guardian-dog form and handlers load before this file. Installing once
// prevents wrapper chains from growing every second while the app is open.
install();
})();
