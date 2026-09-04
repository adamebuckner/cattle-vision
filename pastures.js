let pastures=[];
try{
  const storedPastures=JSON.parse(localStorage.getItem('cv2-pastures')||'[]');
  pastures=Array.isArray(storedPastures)?storedPastures:[];
}catch(error){
  console.error('Saved pasture names could not be read. The original saved value was left unchanged.',error);
}
let pasturePhotoTarget='';
const PASTURE_DOG='Livestock Guardian Dog',PASTURE_HORSE='Horse';
function savePastures(){localStorage.setItem('cv2-pastures',JSON.stringify(pastures));renderPastureOptions();}
function harvestPastures(){let changed=false;for(const a of cattle){const n=(a.location||'').trim();if(n&&!pastures.some(p=>p.name.toLowerCase()===n.toLowerCase())){pastures.push({id:String(Date.now()+Math.random()),name:n});changed=true;}}if(changed)localStorage.setItem('cv2-pastures',JSON.stringify(pastures));renderPastureOptions();}
function renderPastureOptions(){const dl=$('pastureOptions');if(dl)dl.innerHTML=pastures.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${esc(p.name)}"></option>`).join('');}
function openPastures(){harvestPastures();renderPastureManager(false);$('pastureModal').classList.remove('hidden');}
function closePastures(){$('pastureModal').classList.add('hidden');}
function addPasture(){const input=$('newPastureName');if(!input)return;const name=input.value.trim();if(!name)return alert('Enter a pasture name.');if(pastures.some(p=>p.name.toLowerCase()===name.toLowerCase()))return alert('That pasture already exists.');if(typeof window.cancelCloudDelete==='function')window.cancelCloudDelete('pasture',name);const p={id:String(Date.now()+Math.random()),name};pastures.push(p);input.value='';localStorage.setItem('cv2-pastures',JSON.stringify(pastures));renderPastureOptions();renderPastureManager(false);}
function deletePasture(id){const p=pastures.find(x=>String(x.id)===String(id));if(!p)return;const count=cattle.filter(a=>(a.location||'').toLowerCase()===p.name.toLowerCase()).length;if(count&&!confirm(`${count} animal${count===1?' is':'s are'} assigned to ${p.name}. Remove the pasture and leave those animals unassigned?`))return;if(count)cattle.forEach(a=>{if((a.location||'').toLowerCase()===p.name.toLowerCase())setAnimalPasture(a,'');});pastures=pastures.filter(x=>String(x.id)!==String(id));if(typeof window.queueCloudDelete==='function')window.queueCloudDelete('pasture',p.name);savePastures();save();renderPastureManager(false);}
function setAnimalPasture(a,pastureName){if(!a)return;const from=(a.location||'').trim(),to=(pastureName||'').trim();if(from.toLowerCase()===to.toLowerCase()){a.location=to;return}a.locationHistory=Array.isArray(a.locationHistory)?a.locationHistory:[];a.locationHistory.push({from,to,date:new Date().toISOString()});a.location=to;}
function assignAnimalToPasture(animalId,pastureName){const a=cattle.find(x=>String(x.id)===String(animalId));if(!a)return;setAnimalPasture(a,pastureName);save();renderPastureAnimalRows();renderPastureCounts();}
function bulkAssignPasture(){const p=$('bulkPastureSelect').value;if(!p)return alert('Choose the pasture you want to move the selected cattle to.');const checks=[...document.querySelectorAll('.pasture-animal-check:checked')];if(!checks.length)return alert('Select at least one animal.');checks.forEach(c=>{const a=cattle.find(x=>String(x.id)===String(c.value));setAnimalPasture(a,p);});save();renderPastureManager(true);alert(`${checks.length} animal${checks.length===1?'':'s'} moved to ${p}.`);}
function filterPastureAnimals(name){const f=$('pastureSourceFilter');if(f){f.value=name;renderPastureAnimalRows();const list=$('pastureAnimalList');if(list)list.scrollIntoView({behavior:'smooth',block:'start'});}}
function renderPastureAnimalRows(){const names=pastures.slice().sort((a,b)=>a.name.localeCompare(b.name));const source=$('pastureSourceFilter')?.value||'';let rows=cattle.slice().sort((a,b)=>String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true}));if(source==='__unassigned__')rows=rows.filter(a=>!(a.location||'').trim());else if(source)rows=rows.filter(a=>(a.location||'').toLowerCase()===source.toLowerCase());const animals=$('pastureAnimalList');if(!animals)return;animals.innerHTML=rows.length?rows.map(a=>{const label=a.sex===PASTURE_DOG?'Guardian Dog':a.sex===PASTURE_HORSE?`Horse ${esc(a.tag||'N-T')}`:`Tag ${esc(a.tag||'N-T')}`;return `<label class="pasture-animal-row"><input class="pasture-animal-check" type="checkbox" value="${a.id}"><span><b>${label}</b><small>${esc(a.location||'Unassigned')}</small></span><select onchange="assignAnimalToPasture('${a.id}',this.value)"><option value="">Unassigned</option>${names.map(p=>`<option value="${esc(p.name)}" ${String(a.location||'').toLowerCase()===p.name.toLowerCase()?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>`}).join(''):'<div class="empty">No animals match this pasture filter.</div>';}
let bulkSorterLoadPromise=null;
function ensureBulkSorter(){
  if(typeof window.openBulkSorter==='function')return Promise.resolve(true);
  if(bulkSorterLoadPromise)return bulkSorterLoadPromise;
  bulkSorterLoadPromise=new Promise(resolve=>{
    document.getElementById('cvBulkSorterScript')?.remove();
    const script=document.createElement('script');script.id='cvBulkSorterScript';script.src='bulk-sort.js?v=8&retry='+Date.now();
    let timer=0,settled=false;
    const finish=ready=>{if(settled)return;settled=true;clearTimeout(timer);resolve(ready)};
    script.onload=()=>finish(typeof window.openBulkSorter==='function');
    script.onerror=()=>{script.remove();finish(false)};
    timer=setTimeout(()=>{script.remove();finish(false)},12000);
    document.body.appendChild(script);
  }).catch(error=>{console.error('Bulk photo sorter could not load.',error);return false}).then(ready=>{if(!ready)bulkSorterLoadPromise=null;return ready});
  return bulkSorterLoadPromise;
}
window.cvEnsureBulkSorter=ensureBulkSorter;
function startPasturePhotoUpload(name){pasturePhotoTarget=name;const input=$('pasturePhotoInput');if(!input)return;input.value='';input.click();}
async function handlePasturePhotoFiles(e){const files=Array.from(e.target.files||[]);if(!files.length)return;const ready=await ensureBulkSorter();if(!ready){e.target.value='';return alert('The photo sorter could not load. Your selected photos were not changed. Check the connection and tap Choose Existing Photos again.')}closePastures();window.openBulkSorter(files,pasturePhotoTarget);pasturePhotoTarget='';}
function pastureCounts(){const map=new Map();for(const a of cattle){const key=String(a.location||'').trim().toLowerCase();if(!key)continue;let v=map.get(key);if(!v){v={total:0,dogs:0,horses:0};map.set(key,v)}v.total++;if(a.sex===PASTURE_DOG)v.dogs++;if(a.sex===PASTURE_HORSE)v.horses++;}return map;}
function pastureCountText(c){const cattleCount=c.total-c.dogs-c.horses;const parts=[`${cattleCount} cattle`];if(c.dogs)parts.push(`${c.dogs} guardian dog${c.dogs===1?'':'s'}`);if(c.horses)parts.push(`${c.horses} horse${c.horses===1?'':'s'}`);return parts.join(' • ');}
function renderPastureCounts(){const counts=pastureCounts();document.querySelectorAll('.pasture-card').forEach(card=>{const name=card.dataset.pasture||'';const c=counts.get(name.toLowerCase())||{total:0,dogs:0,horses:0};const span=card.querySelector('.pasture-count');if(span)span.textContent=pastureCountText(c);});if(typeof window.cvDecoratePastures==='function')window.cvDecoratePastures();}
function renderPastureManager(renderAnimals=false){renderPastureOptions();const list=$('pastureList');if(!list)return;const names=pastures.slice().sort((a,b)=>a.name.localeCompare(b.name));const counts=pastureCounts();list.innerHTML=names.length?names.map(p=>{const safe=String(p.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");const c=counts.get(p.name.toLowerCase())||{total:0,dogs:0,horses:0};return `<div class="pasture-card" data-pasture="${esc(p.name)}"><div class="pasture-card-head"><div><strong>${esc(p.name)}</strong><span class="pasture-count">${pastureCountText(c)}</span></div><button class="softbtn" onclick="deletePasture('${p.id}')">Remove</button></div><div class="pasture-card-actions"><button class="greenbtn session-primary" onclick="typeof startPasturePhotoSession==='function'?startPasturePhotoSession('${safe}'):alert('Photo session tools are still loading. Try again in a moment.')">Take Pasture Photos</button><button class="softbtn" onclick="typeof openPasturePhotoReview==='function'?openPasturePhotoReview('${safe}'):alert('Photo session tools are still loading. Try again in a moment.')">Review / Tag Photos</button><button class="softbtn" onclick="startPasturePhotoUpload('${safe}')">Choose Existing Photos & Sort Now</button><button class="softbtn" onclick="filterPastureAnimals('${safe}')">Select / Move Cattle</button><button class="softbtn" onclick="typeof openHerdWork==='function'?openHerdWork('${safe}'):alert('Herd work tools are still loading. Try again in a moment.')">Work Entire Herd</button></div></div>`}).join(''):'<div class="empty">No pastures yet. Add your first pasture above.</div>';const source=$('pastureSourceFilter'),oldSource=source?.value||'';if(source){source.innerHTML='<option value="">All cattle</option><option value="__unassigned__">Unassigned cattle</option>'+names.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');if([...source.options].some(o=>o.value===oldSource))source.value=oldSource;}const select=$('bulkPastureSelect');if(select)select.innerHTML='<option value="">Move selected cattle to...</option>'+names.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');const animals=$('pastureAnimalList');if(renderAnimals)renderPastureAnimalRows();else if(animals)animals.innerHTML='<div class="muted">Choose a pasture above and tap Select / Move Cattle to load that herd.</div>';if(typeof window.cvDecoratePastures==='function')window.cvDecoratePastures();}
harvestPastures();
(function renderPasturesForNativeLink(){
  function renderTarget(){
    if(window.location.hash!=='#pastureModal')return;
    harvestPastures();
    renderPastureManager(false);
  }
  window.addEventListener('hashchange',renderTarget);
  renderTarget();
})();
(function loadHerdWork(){if(document.querySelector('script[data-herd-work]'))return;const s=document.createElement('script');s.src='herd-work.js?v=3';s.dataset.herdWork='1';document.body.appendChild(s);})();
