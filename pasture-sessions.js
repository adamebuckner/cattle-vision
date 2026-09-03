(function(){
if(window.__cvPastureSessionsInstalled)return;window.__cvPastureSessionsInstalled=true;

const SESSION_KEY='cv2-pasture-photo-sessions';
const DB_NAME='cv2-pasture-session-media';
const STORE='photos';
const SUPA_URL='https://rtyiqggxruwejqqyqtmv.supabase.co';
const SUPA_KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
let sessionDbPromise=null,stream=null,currentSession=null,lastPreviewUrl='',cloudClient=null;
let review={session:null,items:[],index:0,blob:null,url:''};

const byId=id=>document.getElementById(id);
const h=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const id=()=>crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function sessions(){try{const rows=JSON.parse(localStorage.getItem(SESSION_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
function writeSessions(rows){try{localStorage.setItem(SESSION_KEY,JSON.stringify(rows))}catch(e){console.error('Could not save pasture session index',e);throw new Error('This device could not save the pasture session list. The current photo was not intentionally removed.')}}
function updateSession(s){const rows=sessions(),i=rows.findIndex(x=>x.id===s.id);if(i>=0)rows[i]=s;else rows.push(s);writeSessions(rows);}
function localSession(idv){return sessions().find(x=>x.id===idv)||null}

function openDb(){
  if(sessionDbPromise)return sessionDbPromise;
  sessionDbPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('sessionId','sessionId',{unique:false});s.createIndex('status','status',{unique:false})}};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  return sessionDbPromise;
}
async function putPhoto(p){const d=await openDb();return new Promise((resolve,reject)=>{const q=d.transaction(STORE,'readwrite').objectStore(STORE).put(p);q.onsuccess=()=>resolve(p);q.onerror=()=>reject(q.error)})}
async function deletePhoto(pid){const d=await openDb();return new Promise(resolve=>{try{const q=d.transaction(STORE,'readwrite').objectStore(STORE).delete(pid);q.onsuccess=q.onerror=()=>resolve()}catch{resolve()}})}
async function getPhoto(pid){const d=await openDb();return new Promise((resolve,reject)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).get(pid);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)})}
async function sessionPhotoKeys(sessionId){const d=await openDb();return new Promise((resolve,reject)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).index('sessionId').getAllKeys(IDBKeyRange.only(sessionId));q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error)})}
async function sessionPhotos(sessionId){const keys=await sessionPhotoKeys(sessionId),out=[];for(const k of keys){const p=await getPhoto(k);if(p)out.push(p)}return out.sort((a,b)=>String(a.capturedAt).localeCompare(String(b.capturedAt)))}
async function localPendingCount(sessionId){const ps=await sessionPhotos(sessionId);return ps.filter(p=>(p.status||'pending')==='pending').length}

function ensureUi(){
  if(byId('pastureSessionModal'))return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='pasture-sessions.css?v=1';document.head.appendChild(css);
  const camera=document.createElement('div');camera.id='pastureSessionModal';camera.className='modal hidden';camera.innerHTML=`<div class="sheet ps-sheet"><div class="row ps-head"><div><h2 id="psTitle">Pasture Photo Session</h2><div id="psSub" class="muted"></div></div><button id="psClose" class="softbtn" type="button">Close</button></div><div class="ps-camera-wrap"><video id="psVideo" autoplay muted playsinline></video><div id="psCameraMessage" class="ps-camera-message">Tap Start Camera to begin.</div></div><div class="ps-capture-row"><button id="psStartCamera" class="softbtn" type="button">Start Rear Camera</button><button id="psSnap" class="greenbtn ps-snap" type="button" disabled>Take Photo</button><button id="psChoose" class="softbtn" type="button">Choose Existing Photos</button></div><input id="psFallbackInput" type="file" accept="image/*" multiple hidden><div class="ps-session-status"><b id="psCount">0 photos saved</b><span id="psSaved" class="muted">Every photo is saved to this device before the next one.</span></div><div id="psLast" class="ps-last"></div><button id="psFinish" class="greenbtn" style="width:100%;margin-top:14px" type="button">Finish Session — Sort Later</button></div>`;document.body.appendChild(camera);

  const list=document.createElement('div');list.id='pastureSessionListModal';list.className='modal hidden';list.innerHTML=`<div class="sheet ps-review-list"><div class="row"><div><h2 id="psListTitle">Pasture Photo Sessions</h2><div class="muted">Photos can be captured on the phone and sorted later on any signed-in device after cloud sync.</div></div><button id="psListClose" class="softbtn" type="button">Close</button></div><div id="psCloudNote" class="notice" style="margin:12px 0">Checking this device and the cloud…</div><div id="psSessionList"></div></div>`;document.body.appendChild(list);

  const sorter=document.createElement('div');sorter.id='pastureSessionSortModal';sorter.className='modal hidden';sorter.innerHTML=`<div class="sheet ps-sort-sheet"><div class="row"><div><h2 id="psSortTitle">Sort Pasture Photos</h2><div id="psSortSub" class="muted"></div></div><button id="psSortClose" class="softbtn" type="button">Close</button></div><div id="psSortImage" class="ps-sort-image"></div><div id="psSortProgress" class="muted"></div><label>Tag Number <span class="muted">(leave blank for N-T)</span></label><input id="psSortTag" list="psKnownTags" inputmode="numeric" placeholder="Example: 449"><datalist id="psKnownTags"></datalist><label>If this is a new animal</label><select id="psSortSex"><option>Cow</option><option>Bull</option><option>Heifer</option><option>Steer</option><option>Calf</option></select><div id="psSortMatch" class="notice"></div><div class="ps-sort-actions"><button id="psSkip" class="softbtn" type="button">Skip Photo</button><button id="psAssign" class="greenbtn" type="button">Attach to Tag & Next</button></div></div>`;document.body.appendChild(sorter);

  byId('psClose').onclick=()=>finishPasturePhotoSession(false);
  byId('psStartCamera').onclick=startCamera;
  byId('psSnap').onclick=captureShot;
  byId('psChoose').onclick=()=>byId('psFallbackInput').click();
  byId('psFallbackInput').onchange=handleChosenPhotos;
  byId('psFinish').onclick=()=>finishPasturePhotoSession(true);
  byId('psListClose').onclick=()=>byId('pastureSessionListModal').classList.add('hidden');
  byId('psSortClose').onclick=closeSorter;
  byId('psSortTag').addEventListener('input',updateSortMatch);
  byId('psAssign').onclick=assignCurrentPhoto;
  byId('psSkip').onclick=async()=>{try{await markCurrent('skipped')}catch(e){console.error(e);alert('That photo could not be marked as skipped, so it is still waiting in this session.')}};
}

function stopCamera(){if(stream){for(const t of stream.getTracks())try{t.stop()}catch{}stream=null}const v=byId('psVideo');if(v)v.srcObject=null;const b=byId('psSnap');if(b)b.disabled=true}
async function startCamera(){
  ensureUi();stopCamera();
  const msg=byId('psCameraMessage');
  if(!navigator.mediaDevices?.getUserMedia){msg.textContent='Live camera is not available in this browser. Use Choose Existing Photos or your phone camera picker.';return}
  try{
    if(msg)msg.textContent='Opening rear camera…';
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
    const v=byId('psVideo');v.srcObject=stream;await v.play();
    if(msg)msg.textContent='';byId('psSnap').disabled=false;
  }catch(e){console.error(e);if(msg)msg.textContent='Camera permission was not available. You can still use Choose Existing Photos.'}
}
function canvasBlobFromVideo(){return new Promise((resolve,reject)=>{const v=byId('psVideo');if(!v?.videoWidth)return reject(new Error('Camera is not ready yet.'));const max=1600,scale=Math.min(1,max/Math.max(v.videoWidth,v.videoHeight)),w=Math.max(1,Math.round(v.videoWidth*scale)),hh=Math.max(1,Math.round(v.videoHeight*scale)),c=document.createElement('canvas');c.width=w;c.height=hh;c.getContext('2d').drawImage(v,0,0,w,hh);c.toBlob(b=>b?resolve(b):reject(new Error('Could not capture photo.')),'image/jpeg',0.84)})}
async function fileToJpegBlob(file){return new Promise((resolve,reject)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{try{const max=1600,s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*s)),hh=Math.max(1,Math.round(img.naturalHeight*s)),c=document.createElement('canvas');c.width=w;c.height=hh;c.getContext('2d').drawImage(img,0,0,w,hh);c.toBlob(b=>{URL.revokeObjectURL(u);b?resolve(b):reject(new Error('Photo compression failed.'))},'image/jpeg',0.84)}catch(e){URL.revokeObjectURL(u);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Photo could not be read.'))};img.src=u})}
async function saveSessionBlob(blob,capturedAt=new Date().toISOString()){
  if(!currentSession)throw new Error('No pasture photo session is open.');
  const p={id:id(),sessionId:currentSession.id,pastureName:currentSession.pastureName,blob,capturedAt,status:'pending',cloudPath:''};
  await putPhoto(p);const before=currentSession.photoCount||0;currentSession.photoCount=before+1;
  try{updateSession(currentSession)}catch(e){currentSession.photoCount=before;await deletePhoto(p.id);throw e}
  window.__cvPastureCaptureActive=true;
  try{window.dispatchEvent(new Event('cv-local-change'))}catch{}
  updateCaptureCount();showLast(blob);return p;
}
async function captureShot(){const b=byId('psSnap');if(b)b.disabled=true;try{const blob=await canvasBlobFromVideo();await saveSessionBlob(blob);const s=byId('psSaved');if(s)s.textContent='Saved ✓ — ready for the next cow.'}catch(e){alert(e.message||e)}finally{if(stream&&b)b.disabled=false}}
async function handleChosenPhotos(e){const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;const note=byId('psSaved');for(let i=0;i<files.length;i++){if(note)note.textContent=`Saving chosen photo ${i+1} of ${files.length}…`;try{await saveSessionBlob(await fileToJpegBlob(files[i]),new Date(files[i].lastModified||Date.now()).toISOString())}catch(err){console.error(err);alert(`Photo ${i+1} could not be saved. The photos before it are still safe.`);break}}if(note)note.textContent='Chosen photos saved. You can keep taking more.'}
function showLast(blob){if(lastPreviewUrl)URL.revokeObjectURL(lastPreviewUrl);lastPreviewUrl=URL.createObjectURL(blob);const box=byId('psLast');if(box)box.innerHTML=`<img src="${lastPreviewUrl}" alt="Last saved pasture photo"><span>Last photo saved ✓</span>`}
function updateCaptureCount(){if(!currentSession)return;const n=currentSession.photoCount||0;byId('psCount').textContent=`${n} photo${n===1?'':'s'} saved`}

async function startPasturePhotoSession(pastureName){
  ensureUi();stopCamera();
  currentSession={id:id(),pastureName:String(pastureName||'').trim(),status:'open',startedAt:new Date().toISOString(),finishedAt:'',photoCount:0,cloudId:''};
  try{updateSession(currentSession)}catch(e){console.error(e);currentSession=null;window.__cvPastureCaptureActive=false;alert(e.message||'This pasture session could not be started on this device.');return}
  window.__cvPastureCaptureActive=true;
  byId('psTitle').textContent=`${currentSession.pastureName} Photo Session`;
  byId('psSub').textContent='Walk the pasture and keep taking pictures. No tag numbers are required right now.';
  byId('psCameraMessage').textContent='Tap Start Camera to begin.';byId('psLast').innerHTML='';updateCaptureCount();
  byId('pastureModal')?.classList.add('hidden');byId('pastureSessionModal').classList.remove('hidden');
  setTimeout(startCamera,100);
}
async function finishPasturePhotoSession(showMessage=true){
  if(!currentSession){stopCamera();byId('pastureSessionModal')?.classList.add('hidden');window.__cvPastureCaptureActive=false;return}
  stopCamera();const oldStatus=currentSession.status,oldFinished=currentSession.finishedAt;currentSession.status='ready';currentSession.finishedAt=new Date().toISOString();
  try{updateSession(currentSession)}catch(e){currentSession.status=oldStatus;currentSession.finishedAt=oldFinished;console.error(e);alert('The photos are still on this device, but the session could not be finalized. Keep Cattle Vision open and tap Finish Session again.');return}
  const n=currentSession.photoCount||0,p=currentSession.pastureName;currentSession=null;window.__cvPastureCaptureActive=false;
  byId('pastureSessionModal')?.classList.add('hidden');if(lastPreviewUrl){URL.revokeObjectURL(lastPreviewUrl);lastPreviewUrl=''}
  try{if(typeof window.cvCloudChanged==='function')window.cvCloudChanged();else window.dispatchEvent(new Event('cv-local-change'))}catch{}
  if(showMessage)alert(`${n} photo${n===1?'':'s'} saved in the ${p} pasture session. You can sort and tag them later from this phone, an iPad, or a computer after cloud sync.`);
  if(typeof window.openPastures==='function')window.openPastures();
}
window.startPasturePhotoSession=startPasturePhotoSession;
window.finishPasturePhotoSession=finishPasturePhotoSession;

async function context(){
  if(!window.supabase?.createClient)return null;
  if(!cloudClient)cloudClient=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data}=await cloudClient.auth.getSession(),user=data.session?.user||null,farmId=localStorage.getItem('cv2-cloud-farm-id');
  return user&&farmId?{client:cloudClient,user,farmId}:null;
}
async function cloudSessionsFor(pastureName){const ctx=await context();if(!ctx)return[];let q=ctx.client.from('pasture_photo_sessions').select('*').eq('farm_id',ctx.farmId).order('started_at',{ascending:false});if(pastureName)q=q.eq('pasture_name',pastureName);const {data,error}=await q;if(error)throw error;return data||[]}
async function cloudMediaFor(sessionId){const ctx=await context();if(!ctx)return[];const {data,error}=await ctx.client.from('pasture_session_media').select('*').eq('farm_id',ctx.farmId).eq('session_id',sessionId).order('captured_at');if(error)throw error;return data||[]}

async function openPasturePhotoReview(pastureName=''){
  ensureUi();byId('pastureModal')?.classList.add('hidden');byId('pastureSessionListModal').classList.remove('hidden');byId('psListTitle').textContent=pastureName?`${pastureName} Photo Sessions`:'Pasture Photo Sessions';
  const box=byId('psSessionList');box.innerHTML='<div class="empty">Loading sessions…</div>';let cloud=[];try{cloud=await cloudSessionsFor(pastureName);byId('psCloudNote').textContent=cloud.length?'Cloud sessions are available on this device.':'No cloud sessions found yet. Local sessions are still shown below.'}catch(e){console.warn(e);byId('psCloudNote').textContent='Cloud could not be reached right now. Local sessions are still available on this device.'}
  const locals=sessions().filter(s=>!pastureName||s.pastureName===pastureName),map=new Map();for(const s of cloud)map.set(`cloud:${s.id}`,{source:'cloud',id:s.id,cloudId:s.id,localId:'',pastureName:s.pasture_name,status:s.status,startedAt:s.started_at,finishedAt:s.finished_at});for(const s of locals){const key=s.cloudId?`cloud:${s.cloudId}`:`local:${s.id}`,old=map.get(key)||{};map.set(key,{...old,source:s.cloudId?'both':'local',id:s.id,localId:s.id,cloudId:s.cloudId||old.cloudId||'',pastureName:s.pastureName,status:s.status,startedAt:s.startedAt,finishedAt:s.finishedAt,photoCount:s.photoCount||0})}
  const rows=[...map.values()].sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)));if(!rows.length){box.innerHTML='<div class="empty">No pasture photo sessions yet.</div>';return}
  const html=[];for(const s of rows){let pending=0,total=0;if(s.cloudId){try{const m=await cloudMediaFor(s.cloudId);total=m.length;pending=m.filter(x=>x.sort_status==='pending').length}catch{}}if(s.localId){try{const m=await sessionPhotos(s.localId);if(!total)total=m.length;pending=Math.max(pending,m.filter(x=>(x.status||'pending')==='pending').length)}catch{}}const key=encodeURIComponent(JSON.stringify({localId:s.localId||'',cloudId:s.cloudId||'',pastureName:s.pastureName,startedAt:s.startedAt}));html.push(`<div class="ps-session-card"><div><b>${h(s.pastureName)}</b><span>${new Date(s.startedAt).toLocaleString()}</span><small>${total} photo${total===1?'':'s'} • ${pending} waiting to be sorted</small></div><button class="${pending?'greenbtn':'softbtn'}" type="button" onclick="cvOpenSessionSorter('${key}')">${pending?'Review / Tag Photos':'View Session'}</button></div>`)}box.innerHTML=html.join('')
}
window.openPasturePhotoReview=openPasturePhotoReview;
window.cvOpenSessionSorter=async encoded=>{const s=JSON.parse(decodeURIComponent(encoded));await openSorter(s)};

function tagOptions(){const seen=new Set(),out=[];for(const a of (window.cattle||cattle||[]).slice().sort((a,b)=>String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true}))){const t=String(a.tag||'').trim(),k=t.toLowerCase();if(!t||t==='N-T'||seen.has(k))continue;seen.add(k);out.push(`<option value="${h(t)}">`)}return out.join('')}
async function openSorter(s){
  ensureUi();window.__cvPastureCaptureActive=true;review={session:s,items:[],index:0,blob:null,url:''};
  if(s.localId){for(const p of await sessionPhotos(s.localId))if((p.status||'pending')==='pending')review.items.push({source:'local',id:p.id,legacyId:p.id,capturedAt:p.capturedAt,status:p.status||'pending'})}
  if(s.cloudId){const have=new Set(review.items.map(x=>x.legacyId));for(const m of await cloudMediaFor(s.cloudId))if(m.sort_status==='pending'&&!have.has(String(m.legacy_id)))review.items.push({source:'cloud',id:m.id,legacyId:String(m.legacy_id),storagePath:m.storage_path,capturedAt:m.captured_at,status:m.sort_status})}
  review.items.sort((a,b)=>String(a.capturedAt).localeCompare(String(b.capturedAt)));
  byId('pastureSessionListModal').classList.add('hidden');byId('pastureSessionSortModal').classList.remove('hidden');byId('psSortTitle').textContent=`${s.pastureName} — Sort Photos`;byId('psKnownTags').innerHTML=tagOptions();await renderReviewPhoto();
}
async function cloudDownload(path){const ctx=await context();if(!ctx)throw new Error('Sign in to Cloud to open this photo on this device.');const {data,error}=await ctx.client.storage.from('cattle-vision-media').download(path);if(error)throw error;return data}
async function loadReviewBlob(item){if(item.source==='local'){const p=await getPhoto(item.id);if(!p?.blob)throw new Error('This local photo could not be read.');return p.blob}return cloudDownload(item.storagePath)}
function clearReviewUrl(){if(review.url){URL.revokeObjectURL(review.url);review.url=''}review.blob=null}
async function renderReviewPhoto(){
  clearReviewUrl();const box=byId('psSortImage');if(review.index>=review.items.length){box.innerHTML='<div class="ps-done">All photos in this session are sorted.</div>';byId('psSortProgress').textContent='Session complete';byId('psAssign').disabled=true;byId('psSkip').disabled=true;await completeReviewSession();return}
  const item=review.items[review.index];byId('psSortProgress').textContent=`Photo ${review.index+1} of ${review.items.length} remaining in this review`;byId('psSortTag').value='';byId('psAssign').disabled=false;byId('psSkip').disabled=false;byId('psSortMatch').textContent='Enter the ear-tag number, or leave blank for N-T.';box.innerHTML='<div class="empty">Loading photo…</div>';
  try{review.blob=await loadReviewBlob(item);review.url=URL.createObjectURL(review.blob);box.innerHTML=`<img src="${review.url}" alt="Pasture session photo">`}catch(e){box.innerHTML=`<div class="notice">${h(e.message||e)}</div>`;byId('psAssign').disabled=true}
}
function matchesTag(t){const k=String(t||'').trim().toLowerCase();if(!k)return[];return (window.cattle||cattle||[]).filter(a=>String(a.tag||'').trim().toLowerCase()===k&&a.tag!=='N-T')}
function updateSortMatch(){const t=byId('psSortTag').value.trim(),m=matchesTag(t),box=byId('psSortMatch');if(!t){box.textContent='No tag entered — this will create a new N-T animal record.';byId('psAssign').disabled=false}else if(m.length>1){box.textContent=`Tag ${t} is duplicated on ${m.length} records. Resolve the duplicate before attaching this photo.`;byId('psAssign').disabled=true}else if(m.length===1){box.textContent=`This photo will attach to existing Tag ${m[0].tag}.`;byId('psAssign').disabled=false}else{box.textContent=`Tag ${t} is new. A basic animal record will be created.`;byId('psAssign').disabled=false}}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
async function markCloud(item,status,tag=''){if(!review.session.cloudId)return;const ctx=await context();if(!ctx)return;let q=ctx.client.from('pasture_session_media').update({sort_status:status,assigned_tag:tag||null}).eq('farm_id',ctx.farmId);q=item.source==='cloud'?q.eq('id',item.id):q.eq('session_id',review.session.cloudId).eq('legacy_id',item.legacyId);const {error}=await q;if(error)throw error}
async function markLocal(item,status,tag=''){if(item.source!=='local')return;const p=await getPhoto(item.id);if(!p)return;p.status=status;p.assignedTag=tag||'';await putPhoto(p)}
async function markCurrent(status,tag=''){const item=review.items[review.index];await Promise.all([markLocal(item,status,tag),markCloud(item,status,tag)]);review.index++;await renderReviewPhoto()}
async function deleteAnimalMediaId(mediaId){if(!mediaId||typeof db==='undefined'||!db)return;await new Promise(resolve=>{try{const q=db.transaction('media','readwrite').objectStore('media').delete(mediaId);q.onsuccess=q.onerror=()=>resolve()}catch{resolve()}})}
async function assignCurrentPhoto(){
  const item=review.items[review.index],raw=byId('psSortTag').value.trim(),m=matchesTag(raw);if(raw&&m.length>1)return alert(`Tag ${raw} is duplicated. Resolve that duplicate before attaching this photo.`);if(!review.blob)return alert('The photo has not loaded yet.');const sex=byId('psSortSex').value||'Cow';let animal=m[0]||null;const created=item.capturedAt||new Date().toISOString(),snapshot=JSON.stringify(cattle);let mediaId='';
  try{
    const data=await blobToDataUrl(review.blob);
    if(!animal){animal=typeof norm==='function'?norm({id:id(),tag:raw||'N-T',sex,location:review.session.pastureName||'',created,notes:raw?'Created while sorting a pasture photo session':'No tag visible when pasture session photo was sorted'}):{id:id(),tag:raw||'N-T',sex,location:review.session.pastureName||'',created,breeding:[],calvings:[],health:[]};if(!raw)animal.noTag=true;if(review.session.pastureName)animal.locationHistory=[{from:'',to:review.session.pastureName,date:created}];cattle.push(animal)}else if(!(animal.location||'').trim()&&review.session.pastureName){if(typeof setAnimalPasture==='function')setAnimalPasture(animal,review.session.pastureName);else animal.location=review.session.pastureName}
    mediaId=id();await putMedia({id:mediaId,animalId:String(animal.id),type:'photo',data,created,source:'pasture-photo-session'});if(typeof save==='function')save();await markCurrent('assigned',raw||'N-T');
  }catch(e){console.error(e);if(mediaId)await deleteAnimalMediaId(mediaId);try{await Promise.allSettled([markLocal(item,'pending',''),markCloud(item,'pending','')])}catch{}try{cattle=JSON.parse(snapshot).map(a=>typeof norm==='function'?norm(a):a);localStorage.setItem('cv2-cattle',JSON.stringify(cattle));if(typeof window.render==='function')window.render()}catch(rollbackError){console.error('Pasture photo rollback could not fully persist',rollbackError)}alert('That photo could not be attached cleanly, so Cattle Vision rolled the animal change back and kept the pasture photo waiting to be sorted.')
  }
}
async function completeReviewSession(){const s=review.session;if(s.localId){const ls=localSession(s.localId);if(ls){ls.status='complete';try{updateSession(ls)}catch(e){console.warn(e)}}}if(s.cloudId){const ctx=await context();if(ctx){const {error}=await ctx.client.from('pasture_photo_sessions').update({status:'complete',updated_at:new Date().toISOString()}).eq('farm_id',ctx.farmId).eq('id',s.cloudId);if(error)console.warn('Could not mark cloud pasture session complete',error)}}window.__cvPastureCaptureActive=false;try{window.cvCloudChanged?.()}catch{}}
function closeSorter(){clearReviewUrl();byId('pastureSessionSortModal')?.classList.add('hidden');window.__cvPastureCaptureActive=false;try{window.cvCloudChanged?.()}catch{}review={session:null,items:[],index:0,blob:null,url:''}}

async function uploadWithRetry(client,path,blob){let last;for(let n=1;n<=3;n++){try{const {error}=await client.storage.from('cattle-vision-media').upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:true});if(!error)return;last=error}catch(e){last=e}if(n<3)await new Promise(r=>setTimeout(r,n*1000))}throw last||new Error('Pasture session photo upload failed')}
window.cvSyncPastureSessions=async function(client,farm,user,pmap){
  const rows=sessions();if(!rows.length)return{sessions:0,uploaded:0,already:0};let uploaded=0,already=0;const {data:existingSessions,error:se}=await client.from('pasture_photo_sessions').select('id,legacy_id,status').eq('farm_id',farm.id);if(se)throw se;const smap=new Map((existingSessions||[]).map(x=>[String(x.legacy_id),x]));const {data:existingMedia,error:me}=await client.from('pasture_session_media').select('id,legacy_id,storage_path,sort_status,assigned_tag').eq('farm_id',farm.id);if(me)throw me;const mmap=new Map((existingMedia||[]).map(x=>[String(x.legacy_id),x]));
  for(const s of rows){const pastureId=pmap?.get?.(String(s.pastureName||'').toLowerCase())||null,row={farm_id:farm.id,pasture_id:pastureId,legacy_id:String(s.id),pasture_name:s.pastureName,status:s.status||'ready',started_at:s.startedAt||new Date().toISOString(),finished_at:s.finishedAt||null,created_by:user.id,updated_at:new Date().toISOString()};const {data:cs,error}=await client.from('pasture_photo_sessions').upsert(row,{onConflict:'farm_id,legacy_id'}).select('id').single();if(error)throw error;s.cloudId=cs.id;smap.set(String(s.id),{id:cs.id});const keys=await sessionPhotoKeys(s.id);for(const key of keys){const p=await getPhoto(key);if(!p?.blob)continue;const ex=mmap.get(String(p.id));const path=ex?.storage_path||p.cloudPath||`${farm.id}/pasture-sessions/${cs.id}/${String(p.id).replace(/[^A-Za-z0-9._-]/g,'_')}.jpg`;if(ex){already++;p.cloudPath=path}else{await uploadWithRetry(client,path,p.blob);uploaded++}const {error:pe}=await client.from('pasture_session_media').upsert({farm_id:farm.id,session_id:cs.id,legacy_id:String(p.id),storage_path:path,mime_type:p.blob.type||'image/jpeg',byte_size:p.blob.size,captured_at:p.capturedAt||new Date().toISOString(),sort_status:p.status||'pending',assigned_tag:p.assignedTag||null,created_by:user.id},{onConflict:'farm_id,legacy_id'});if(pe)throw pe;p.cloudPath=path;await putPhoto(p);mmap.set(String(p.id),{storage_path:path})}updateSession(s)}writeSessions(rows);return{sessions:rows.length,uploaded,already}
};

window.cvPastureSessionPendingCount=async function(pastureName){let n=0;for(const s of sessions().filter(x=>x.pastureName===pastureName&&x.status!=='complete'))n+=await localPendingCount(s.id);return n};
ensureUi();
})();