let bulkFiles=[];
let bulkCurrentUrl='';
let bulkPasture='';
let bulkIndex=0;
let bulkSaved=0;
window.bulkVoiceDrafts=window.bulkVoiceDrafts||{};

function newId(){
  return (typeof crypto!=='undefined'&&crypto.randomUUID)
    ?crypto.randomUUID()
    :Date.now().toString(36)+Math.random().toString(36).slice(2);
}

function clearBulkCurrentUrl(){
  if(!bulkCurrentUrl)return;
  URL.revokeObjectURL(bulkCurrentUrl);
  bulkCurrentUrl='';
}

function closeBulkSorter(){
  clearBulkCurrentUrl();
  bulkFiles=[];
  bulkPasture='';
  bulkIndex=0;
  bulkSaved=0;
  window.bulkVoiceDrafts={};
  const m=$('bulkModal');
  if(m)m.classList.add('hidden');
  if($('photoInput'))$('photoInput').value='';
  if($('bulkGrid'))$('bulkGrid').innerHTML='';
  if($('bulkProgress'))$('bulkProgress').textContent='';
}

function openBulkSorter(files,pastureName=''){
  clearBulkCurrentUrl();
  bulkFiles=Array.from(files||[]).filter(f=>f.type&&f.type.startsWith('image/'));
  if(!bulkFiles.length)return;
  bulkPasture=pastureName||'';
  bulkIndex=0;
  bulkSaved=0;
  window.bulkVoiceDrafts={};
  renderBulkSorter();
  $('bulkModal').classList.remove('hidden');
}

function tagOptions(){
  return cattle
    .filter(a=>a.tag&&a.tag!=='N-T')
    .slice()
    .sort((a,b)=>String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true}))
    .map(a=>`<option value="${esc(a.tag)}">`)
    .join('');
}

function insertDash(input){
  if(!input)return;
  const start=input.selectionStart??input.value.length;
  const end=input.selectionEnd??input.value.length;
  input.value=input.value.slice(0,start)+'-'+input.value.slice(end);
  input.focus();
  try{input.setSelectionRange(start+1,start+1)}catch{}
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

function renderBulkSorter(){
  const g=$('bulkGrid');
  if(!g||!bulkFiles.length)return;

  $('bulkCount').textContent=`${bulkFiles.length} photo${bulkFiles.length===1?'':'s'}`;
  const note=$('bulkPastureNote');
  if(note){
    note.textContent=bulkPasture
      ?`Saving one photo at a time into ${bulkPasture}. Each photo is permanently saved before you move to the next one.`
      :'Saving one photo at a time. Each photo is permanently saved before you move to the next one.';
  }

  const i=bulkIndex;
  clearBulkCurrentUrl();
  bulkCurrentUrl=URL.createObjectURL(bulkFiles[i]);
  const vd=window.bulkVoiceDrafts[i]||{};
  const vs=[
    vd.tag?`Tag ${vd.tag}`:'N-T if left blank',
    vd.calved?'calved this year':'',
    vd.location||'',
    vd.flag||''
  ].filter(Boolean).join(' • ');

  g.innerHTML=`<div class="bulk-card" data-i="${i}">
    <img src="${bulkCurrentUrl}" alt="Photo ${i+1}">
    <div class="bulk-fields">
      <div class="muted" style="margin-bottom:8px">Photo ${i+1} of ${bulkFiles.length} • ${bulkSaved} already saved</div>
      <label>Tag Number <button type="button" class="dash-suggest" onclick="insertDash($('bulkCurrentTag'))">Add -</button></label>
      <input id="bulkCurrentTag" class="bulk-tag" data-i="${i}" list="bulkKnownTags" inputmode="numeric" placeholder="Tag, or leave blank for N-T" value="${vd.tag?esc(vd.tag):''}">
      <label>If tag is new, animal type</label>
      <select id="bulkCurrentSex" class="bulk-sex" data-i="${i}">
        <option ${vd.sex==='Cow'||!vd.sex?'selected':''}>Cow</option>
        <option ${vd.sex==='Bull'?'selected':''}>Bull</option>
        <option ${vd.sex==='Heifer'?'selected':''}>Heifer</option>
        <option ${vd.sex==='Steer'?'selected':''}>Steer</option>
        <option ${vd.sex==='Calf'?'selected':''}>Calf</option>
      </select>
      <button type="button" class="voicebtn" onclick="openBulkVoice(${i})">Talk About This Cow</button>
      <div class="voice-summary" id="bulkVoiceSummary${i}">${esc(vs)}</div>
      <div class="bulk-status" id="bulkStatus${i}"></div>
      <button id="bulkSaveOne" type="button" class="greenbtn" style="width:100%;margin-top:10px" onclick="saveCurrentBulkPhoto()">${i===bulkFiles.length-1?'Save Final Photo':'Save This Photo & Next'}</button>
    </div>
  </div>
  <datalist id="bulkKnownTags">${tagOptions()}</datalist>`;

  const inp=$('bulkCurrentTag');
  const update=()=>{
    const t=inp.value.trim();
    const a=t?cattle.find(x=>x.tag&&x.tag!=='N-T'&&x.tag.toLowerCase()===t.toLowerCase()):null;
    const s=$('bulkStatus'+i);
    if(s)s.textContent=t
      ?(a?`Will attach to existing Tag ${a.tag}`:'New tag — a basic animal record will be created')
      :'No tag — will save as N-T';
  };

  inp.addEventListener('input',()=>{
    window.bulkVoiceDrafts[i]=Object.assign({},window.bulkVoiceDrafts[i]||{},
      {tag:inp.value.trim(),sex:$('bulkCurrentSex')?.value||'Cow'});
    update();
  });
  $('bulkCurrentSex')?.addEventListener('change',e=>{
    window.bulkVoiceDrafts[i]=Object.assign({},window.bulkVoiceDrafts[i]||{},
      {tag:inp.value.trim(),sex:e.target.value});
  });
  update();
  const prog=$('bulkProgress');
  if(prog)prog.textContent=bulkSaved?`${bulkSaved} photo${bulkSaved===1?'':'s'} safely saved so far.`:'';
}

function applyBulkTagToEmpty(){
  const t=$('bulkApplyTag')?.value.trim();
  if(!t)return;
  const inp=$('bulkCurrentTag');
  if(inp&&!inp.value.trim()){
    inp.value=t;
    inp.dispatchEvent(new Event('input',{bubbles:true}));
  }
}

async function saveCurrentBulkPhoto(){
  if(!db)return alert('Photo storage is not available in this browser.');
  if(bulkIndex>=bulkFiles.length)return;
  const i=bulkIndex,btn=$('bulkSaveOne');
  if(btn)btn.disabled=true;
  const raw=$('bulkCurrentTag')?.value.trim()||'';
  const sex=$('bulkCurrentSex')?.value||'Cow';
  const destination=bulkPasture;
  let animal=null;
  try{
    if(raw)animal=cattle.find(a=>a.tag&&a.tag!=='N-T'&&a.tag.toLowerCase()===raw.toLowerCase());
    if(!animal){
      const tag=raw||'N-T',created=new Date().toISOString();
      animal=norm({id:newId(),tag,sex,location:destination||'',created,notes:raw?'Created during bulk photo import':'No tag visible at import; assign permanent tag later'});
      if(!raw)animal.noTag=true;
      if(destination)animal.locationHistory=[{from:'',to:destination,date:created}];
      cattle.push(animal);
    }else if(destination){
      if(typeof setAnimalPasture==='function')setAnimalPasture(animal,destination);
      else animal.location=destination;
    }
    const vd=Object.assign({},window.bulkVoiceDrafts[i]||{},{tag:raw,sex});
    if(vd&&typeof applyVoiceDraftToAnimal==='function')applyVoiceDraftToAnimal(animal,vd);
    const data=await compressPhoto(bulkFiles[i]);
    await putMedia({id:newId(),animalId:String(animal.id),type:'photo',data,created:new Date().toISOString(),source:destination?'pasture-bulk-import':'bulk-import'});
    save();
    bulkSaved++;
    const prog=$('bulkProgress');
    if(prog)prog.textContent=`${bulkSaved} of ${bulkFiles.length} photos safely saved.`;
    if(i===bulkFiles.length-1){
      const total=bulkFiles.length;
      closeBulkSorter();
      render();
      alert(`${total} photo${total===1?'':'s'} saved.${destination?` Herd assigned to ${destination}.`:''}`);
      return;
    }
    bulkIndex++;
    renderBulkSorter();
  }catch(e){
    console.error(e);
    alert('That photo could not be saved. Nothing after it was changed. Try again, or use a smaller batch.');
  }finally{
    const b=$('bulkSaveOne');
    if(b)b.disabled=false;
  }
}

async function saveBulkPhotos(){return saveCurrentBulkPhoto()}

if($('photoInput'))$('photoInput').onchange=e=>{
  const files=Array.from(e.target.files||[]);
  if(files.length===1)openAddWithMedia('photos',files);
  else if(files.length>1)openBulkSorter(files);
};

(function setupTagDash(){
  ['aTag','rTag'].forEach(id=>{
    const el=$(id);
    if(!el)return;
    el.setAttribute('inputmode','numeric');
    const label=el.parentElement?.querySelector('label');
    if(label&&!label.querySelector('.dash-suggest')){
      const b=document.createElement('button');
      b.type='button';
      b.className='dash-suggest';
      b.textContent='Add -';
      b.onclick=()=>insertDash(el);
      label.appendChild(b);
    }
  });
  const bulkNote=document.querySelector('#bulkModal .bulk-note');
  if(bulkNote)bulkNote.innerHTML='<span id="bulkCount" class="bulk-count">0 photos</span> selected. Cattle Vision saves each photo before moving to the next so a browser crash cannot wipe out the whole batch.<div id="bulkPastureNote" style="margin-top:6px"></div>';
  const saveBtn=$('bulkSave');
  if(saveBtn)saveBtn.style.display='none';
})();
