(function(){
if(window.__cvPastureSessionCloudInstalled)return;window.__cvPastureSessionCloudInstalled=true;
const SESSION_KEY='cv2-pasture-photo-sessions',DB_NAME='cv2-pasture-session-media',STORE='photos';
const URL='https://rtyiqggxruwejqqyqtmv.supabase.co',KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
let client=null,wrapped=false;
function rows(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'[]')}catch{return[]}}
function saveRows(v){localStorage.setItem(SESSION_KEY,JSON.stringify(v))}
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('sessionId','sessionId',{unique:false});s.createIndex('status','status',{unique:false})}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function keysFor(sessionId){const d=await db();return new Promise((resolve,reject)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).index('sessionId').getAllKeys(IDBKeyRange.only(sessionId));q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error)})}
async function getPhoto(k){const d=await db();return new Promise((resolve,reject)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).get(k);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)})}
async function putPhoto(p){const d=await db();return new Promise((resolve,reject)=>{const q=d.transaction(STORE,'readwrite').objectStore(STORE).put(p);q.onsuccess=()=>resolve();q.onerror=()=>reject(q.error)})}
async function ctx(){if(!window.supabase?.createClient)return null;if(!client)client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});const {data}=await client.auth.getSession(),user=data.session?.user||null,farmId=localStorage.getItem('cv2-cloud-farm-id');return user&&farmId?{client,user,farmId}:null}
async function upload(c,path,blob){let last;for(let i=1;i<=3;i++){try{const {error}=await c.storage.from('cattle-vision-media').upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:true});if(!error)return;last=error}catch(e){last=e}if(i<3)await new Promise(r=>setTimeout(r,i*900))}throw last||new Error('Pasture photo upload failed')}
async function sync(){
  const local=rows();if(!local.length)return{sessions:0,uploaded:0,already:0};const x=await ctx();if(!x)return{sessions:local.length,uploaded:0,already:0,offline:true};
  const {client:c,user,farmId}=x;
  const [{data:pastures,error:pe},{data:cloudSessions,error:se},{data:cloudMedia,error:me}]=await Promise.all([c.from('pastures').select('id,name').eq('farm_id',farmId),c.from('pasture_photo_sessions').select('id,legacy_id').eq('farm_id',farmId),c.from('pasture_session_media').select('legacy_id,storage_path').eq('farm_id',farmId)]);
  if(pe)throw pe;if(se)throw se;if(me)throw me;
  const pmap=new Map((pastures||[]).map(p=>[String(p.name||'').toLowerCase(),p.id])),smap=new Map((cloudSessions||[]).map(s=>[String(s.legacy_id),s.id])),mmap=new Map((cloudMedia||[]).map(m=>[String(m.legacy_id),m.storage_path]));let uploaded=0,already=0;
  for(const s of local){
    const row={farm_id:farmId,pasture_id:pmap.get(String(s.pastureName||'').toLowerCase())||null,legacy_id:String(s.id),pasture_name:s.pastureName||'Pasture',status:s.status||'ready',started_at:s.startedAt||new Date().toISOString(),finished_at:s.finishedAt||null,created_by:user.id,updated_at:new Date().toISOString()};
    const {data:cs,error}=await c.from('pasture_photo_sessions').upsert(row,{onConflict:'farm_id,legacy_id'}).select('id').single();if(error)throw error;s.cloudId=cs.id;smap.set(String(s.id),cs.id);
    const photoKeys=await keysFor(s.id);for(const k of photoKeys){const p=await getPhoto(k);if(!p?.blob)continue;let path=mmap.get(String(p.id))||p.cloudPath||`${farmId}/pasture-sessions/${cs.id}/${String(p.id).replace(/[^A-Za-z0-9._-]/g,'_')}.jpg`;if(mmap.has(String(p.id)))already++;else{await upload(c,path,p.blob);uploaded++}
      const {error:ie}=await c.from('pasture_session_media').upsert({farm_id:farmId,session_id:cs.id,legacy_id:String(p.id),storage_path:path,mime_type:p.blob.type||'image/jpeg',byte_size:p.blob.size,captured_at:p.capturedAt||new Date().toISOString(),sort_status:p.status||'pending',assigned_tag:p.assignedTag||null,created_by:user.id},{onConflict:'farm_id,legacy_id'});if(ie)throw ie;p.cloudPath=path;await putPhoto(p);mmap.set(String(p.id),path)}
  }
  saveRows(local);return{sessions:local.length,uploaded,already};
}
window.cvSyncPastureSessionsStandalone=sync;
function install(){if(wrapped||typeof window.cloudSyncNow!=='function')return false;const original=window.cloudSyncNow;const hook=async function(silent=false){const result=await original.apply(this,arguments);if(window.__cvBulkImportActive===true||window.__cvPastureCaptureActive===true)return result;try{const sr=await sync();return Object.assign({},result,{pastureSessions:sr})}catch(e){console.error('Pasture photo session cloud sync paused',e);try{localStorage.setItem('cv2-cloud-dirty','1')}catch{}if(!silent)alert('Your cattle records finished syncing, but some pasture-session photos are still waiting for cloud backup. They remain saved on this device and will retry later.');return Object.assign({},result,{pastureSessions:{ok:false,error:e}})}};hook.__cvPastureSessionCloudHook=true;window.cloudSyncNow=hook;wrapped=true;return true}
const t=setInterval(()=>{if(install())clearInterval(t)},300);setTimeout(()=>{install()},50);
})();