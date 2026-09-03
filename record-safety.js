(function(){
if(window.__cvRecordSafetyInstalled)return;
window.__cvRecordSafetyInstalled=true;

function snapshot(){try{return JSON.stringify(cattle)}catch{return'[]'}}
function restore(raw){
  try{cattle=JSON.parse(raw).map(a=>typeof norm==='function'?norm(a):a)}catch(e){console.error('Could not restore in-memory cattle snapshot',e);return}
  try{localStorage.setItem('cv2-cattle',JSON.stringify(cattle))}catch(e){console.error('Could not persist restored cattle snapshot',e)}
  try{if(typeof window.render==='function')window.render()}catch(e){console.error(e)}
}
function wrapTransactional(name){
  const original=window[name];
  if(typeof original!=='function'||original.__cvTransactional)return;
  const wrapped=function(){
    const before=snapshot();
    try{return original.apply(this,arguments)}catch(e){
      console.error(`${name} did not complete; restoring the prior cattle record state`,e);
      restore(before);
      return undefined;
    }
  };
  wrapped.__cvTransactional=true;
  window[name]=wrapped;
}

['saveRecord','addBreeding','addCalving','addHealth'].forEach(wrapTransactional);

if(typeof window.deleteAnimal==='function'&&!window.deleteAnimal.__cvSaferDelete){
  const saferDelete=async function(){
    if(!confirm('Delete this animal and its stored media from this device? If cloud sync is on, the cloud copy will also be removed.'))return;
    const id=(typeof currentId!=='undefined'&&currentId!==null)?String(currentId):'';
    if(!id)return;
    const before=snapshot();
    const existed=(cattle||[]).some(a=>String(a.id)===id);
    if(!existed)return;
    cattle=cattle.filter(a=>String(a.id)!==id);
    try{
      // Persist the record deletion before removing its local photos/videos. If the
      // metadata save fails, nothing destructive happens to the media.
      save();
    }catch(e){
      console.error('Animal deletion could not be saved; restoring record',e);
      restore(before);
      return;
    }
    try{
      if(typeof deleteMediaFor==='function')await deleteMediaFor(id);
    }catch(e){
      console.error('Animal record deleted, but local media cleanup will need another pass',e);
      alert('The animal record was deleted safely, but some local photo/video cleanup did not finish. The record will not be restored just to retry media cleanup.');
    }
    try{if(typeof closeRecord==='function')closeRecord()}catch{}
  };
  saferDelete.__cvSaferDelete=true;
  window.deleteAnimal=saferDelete;
}
})();