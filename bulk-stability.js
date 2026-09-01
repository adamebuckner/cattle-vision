(function(){
if(window.__cvBulkStabilityInstalled)return;
window.__cvBulkStabilityInstalled=true;

const DIRTY_KEY='cv2-cloud-dirty';
const FIELD_UNTIL_KEY='cv2-field-work-until';
const FIELD_IDLE_MS=5*60*1000;
const SUPABASE_HOST='rtyiqggxruwejqqyqtmv.supabase.co';
const nativeSetItem=Storage.prototype.setItem;
let deferredCloud=false;
let wrappedCloudFn=null;
let wrappedChangedFn=null;
let wrappedSavePhotoFn=null;
let idleTimer=null;

function nativeLocalSet(key,value){nativeSetItem.call(localStorage,key,value)}
function markDirty(){try{nativeLocalSet(DIRTY_KEY,'1')}catch(e){console.warn('Could not mark field work for cloud sync',e)}}
function active(){return window.__cvBulkImportActive===true||window.__cvPastureCaptureActive===true}
function fieldUntil(){const n=Number(localStorage.getItem(FIELD_UNTIL_KEY)||0);return Number.isFinite(n)?n:0}
function inCooldown(){return Date.now()<fieldUntil()}
function touchFieldWork(){
  try{nativeLocalSet(FIELD_UNTIL_KEY,String(Date.now()+FIELD_IDLE_MS))}catch{}
  scheduleIdleCloud();
}

function scheduleIdleCloud(){
  clearTimeout(idleTimer);
  const wait=Math.max(1200,fieldUntil()-Date.now()+1200);
  idleTimer=setTimeout(()=>{
    if(active()||inCooldown()){scheduleIdleCloud();return}
    ensureChangedGuard();
    ensureCloudGuard();
    try{
      if(typeof window.cvCloudChanged==='function')window.cvCloudChanged();
      else window.dispatchEvent(new Event('cv-local-change'));
    }catch(e){console.warn('Field work is safe locally; cloud sync will retry later',e)}
  },wait);
}

// Give cattle entry priority over an already-running Supabase backup. If a cloud
// request tries to start while the sorter/camera is open, make it look like a temporary
// network interruption so the cloud job exits and can resume later.
if(!window.__cvFieldFetchGuardInstalled){
  window.__cvFieldFetchGuardInstalled=true;
  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(active()&&url.includes(SUPABASE_HOST)&&(url.includes('/rest/v1/')||url.includes('/storage/v1/'))){
        return Promise.reject(new TypeError('Failed to fetch: cattle entry has priority'));
      }
    }catch{}
    return originalFetch(input,init);
  };
}

// Media saves dispatch this event. During pasture/photo entry, do not wake cloud.
window.addEventListener('cv-local-change',e=>{
  if(!active())return;
  deferredCloud=true;
  markDirty();
  touchFieldWork();
  e.stopImmediatePropagation();
},true);

// Save every cow immediately to local storage, but skip expensive herd redraws and
// cloud wakeups while a bulk sorter batch is open.
if(typeof window.save==='function'&&!window.save.__cvBulkLightSave){
  const normalSave=window.save;
  const guardedSave=function(){
    if(!active()||window.__cvPastureCaptureActive===true)return normalSave.apply(this,arguments);
    try{
      nativeLocalSet('cv2-cattle',JSON.stringify(cattle));
      markDirty();
      touchFieldWork();
      window.__cvBulkHadSaves=true;
      return true;
    }catch(e){
      console.error('Bulk local save failed',e);
      throw e;
    }
  };
  guardedSave.__cvBulkLightSave=true;
  window.save=guardedSave;
}

function ensureChangedGuard(){
  const fn=window.cvCloudChanged;
  if(typeof fn!=='function'||fn===wrappedChangedFn||fn.__cvBulkChangedGuard)return;
  const guarded=function(){
    if(active()||inCooldown()){
      deferredCloud=true;
      markDirty();
      scheduleIdleCloud();
      return;
    }
    return fn.apply(this,arguments);
  };
  guarded.__cvBulkChangedGuard=true;
  wrappedChangedFn=guarded;
  window.cvCloudChanged=guarded;
}

function ensureCloudGuard(){
  const fn=window.cloudSyncNow;
  if(typeof fn!=='function'||fn===wrappedCloudFn||fn.__cvBulkCloudGuard)return;
  const guarded=async function(silent=false){
    // Manual Sync Now is allowed after a batch. Automatic sync waits for idle time.
    if(active()||(silent&&inCooldown())){
      deferredCloud=true;
      markDirty();
      scheduleIdleCloud();
      return {ok:true,deferred:true,fieldWork:true};
    }
    return fn.apply(this,arguments);
  };
  guarded.__cvBulkCloudGuard=true;
  wrappedCloudFn=guarded;
  window.cloudSyncNow=guarded;
}

// The sorter itself is later hardened by qa-hardening.js. Keep this memory wrapper
// around whichever save function is newest. Once a photo advances successfully,
// release the original iPhone File reference immediately.
function ensurePhotoMemoryGuard(){
  const fn=window.saveCurrentBulkPhoto;
  if(typeof fn!=='function'||fn===wrappedSavePhotoFn||fn.__cvBulkMemoryGuard)return;
  const guarded=async function(){
    const i=typeof bulkIndex==='number'?bulkIndex:-1;
    const before=typeof bulkSaved==='number'?bulkSaved:0;
    const out=await fn.apply(this,arguments);
    try{
      if(i>=0&&typeof bulkFiles!=='undefined'&&Array.isArray(bulkFiles)&&typeof bulkIndex==='number'&&bulkIndex>i&&typeof bulkSaved==='number'&&bulkSaved>before){
        bulkFiles[i]=null;
      }
    }catch{}
    return out;
  };
  guarded.__cvBulkMemoryGuard=true;
  wrappedSavePhotoFn=guarded;
  window.saveCurrentBulkPhoto=guarded;
}

if(typeof window.openBulkSorter==='function'&&!window.openBulkSorter.__cvBulkSessionGuard){
  const open=window.openBulkSorter;
  const guardedOpen=function(){
    window.__cvBulkImportActive=true;
    window.__cvBulkHadSaves=false;
    deferredCloud=false;
    touchFieldWork();
    ensureChangedGuard();
    ensureCloudGuard();
    ensurePhotoMemoryGuard();
    return open.apply(this,arguments);
  };
  guardedOpen.__cvBulkSessionGuard=true;
  window.openBulkSorter=guardedOpen;
}

if(typeof window.closeBulkSorter==='function'&&!window.closeBulkSorter.__cvBulkSessionGuard){
  const close=window.closeBulkSorter;
  const guardedClose=function(){
    const hadSaves=window.__cvBulkHadSaves===true||(typeof bulkSaved==='number'&&bulkSaved>0);
    const out=close.apply(this,arguments);
    window.__cvBulkImportActive=false;
    window.__cvBulkHadSaves=false;
    if(hadSaves||deferredCloud){
      markDirty();
      touchFieldWork();
      if(typeof window.render==='function')window.render();
    }
    return out;
  };
  guardedClose.__cvBulkSessionGuard=true;
  window.closeBulkSorter=guardedClose;
}

// Cloud and QA wrappers load asynchronously. Keep our field-priority guards outermost.
setInterval(()=>{
  ensureChangedGuard();
  ensureCloudGuard();
  ensurePhotoMemoryGuard();
},500);

if(inCooldown())scheduleIdleCloud();
})();