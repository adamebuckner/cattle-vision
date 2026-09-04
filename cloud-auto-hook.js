(function(){
function install(){
  if(window.__cvCloudSaveHookInstalled)return true;
  if(typeof window.save!=='function')return false;
  const original=window.save;
  window.save=function(){
    const result=original.apply(this,arguments);
    try{
      if(typeof window.cvCloudChanged==='function')window.cvCloudChanged();
      else window.dispatchEvent(new Event('cv-local-change'));
    }catch(e){console.error('Cattle Vision cloud change trigger failed',e)}
    return result;
  };
  Object.assign(window.save,original);
  window.__cvCloudSaveHookInstalled=true;
  return true;
}
if(!install()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>40)clearInterval(timer);
  },250);
}
})();
