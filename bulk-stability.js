(function(){
if(window.__cvBulkStabilityInstalled)return;
window.__cvBulkStabilityInstalled=true;

const DIRTY_KEY='cv2-cloud-dirty';
const nativeSetItem=Storage.prototype.setItem;
let deferredCloud=false;
let wrappedCloudFn=null;
let wrappedChangedFn=null;

function nativeLocalSet(key,value){
  nativeSetItem.call(localStorage,key,value);
}

function markDirty(){
  try{nativeLocalSet(DIRTY_KEY,'1')}catch(e){console.warn('Could not mark bulk work for cloud sync',e)}
}

function active(){return window.__cvBulkImportActive===true}

// Media saves dispatch this event. During a bulk pasture/photo session we keep it
// from waking the cloud uploader while Safari is also compressing and saving photos.
window.addEventListener('cv-local-change',e=>{
  if(!active())return;
  deferredCloud=true;
  markDirty();
  e.stopImmediatePropagation();
},true);

// Replace the normal save path only while a bulk session is active. Each cow is
// still persisted immediately, but we skip the full herd redraw and cloud wake-up.
if(typeof window.save==='function'&&!window.save.__cvBulkLightSave){
  const normalSave=window.save;
  const guardedSave=function(){
    if(!active())return normalSave.apply(this,arguments);
    try{
      nativeLocalSet('cv2-cattle',JSON.stringify(cattle));
      markDirty();
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
    if(active()){
      deferredCloud=true;
      markDirty();
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
    if(active()){
      deferredCloud=true;
      markDirty();
      return {ok:true,deferred:true};
    }
    return fn.apply(this,arguments);
  };
  guarded.__cvBulkCloudGuard=true;
  wrappedCloudFn=guarded;
  window.cloudSyncNow=guarded;
}

function queueOneCloudPass(){
  markDirty();
  deferredCloud=false;
  setTimeout(()=>{
    ensureChangedGuard();
    ensureCloudGuard();
    try{
      if(typeof window.cvCloudChanged==='function')window.cvCloudChanged();
      else window.dispatchEvent(new Event('cv-local-change'));
    }catch(e){console.warn('Bulk work saved locally; cloud sync will retry later',e)}
  },1200);
}

if(typeof window.openBulkSorter==='function'&&!window.openBulkSorter.__cvBulkSessionGuard){
  const open=window.openBulkSorter;
  const guardedOpen=function(){
    window.__cvBulkImportActive=true;
    window.__cvBulkHadSaves=false;
    deferredCloud=false;
    ensureChangedGuard();
    ensureCloudGuard();
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
      if(typeof window.render==='function')window.render();
      queueOneCloudPass();
    }
    return out;
  };
  guardedClose.__cvBulkSessionGuard=true;
  window.closeBulkSorter=guardedClose;
}

// Cloud wrappers are loaded asynchronously. Keep our guard outermost while the
// page finishes starting so a visibility/network event cannot start a sync mid-batch.
setInterval(()=>{
  ensureChangedGuard();
  ensureCloudGuard();
},500);
})();