(function(){
if(window.__cvGuardianLitterRefreshInstalled)return;window.__cvGuardianLitterRefreshInstalled=true;
const DOG='Livestock Guardian Dog';
const herd=()=>typeof cattle!=='undefined'&&Array.isArray(cattle)?cattle:[];
const isDog=a=>a&&a.sex===DOG;
function currentDog(){return herd().find(a=>String(a.id)===String(typeof currentId!=='undefined'?currentId:''))}
function redraw(a){if(a&&isDog(a)&&typeof window.cvRenderDogLitters==='function')setTimeout(()=>window.cvRenderDogLitters(a),30)}
function install(){
  if(typeof window.saveRecord==='function'&&!window.saveRecord.__cvLitterRefresh){const old=window.saveRecord;window.saveRecord=function(){const a=currentDog(),r=old.apply(this,arguments);redraw(a);return r};window.saveRecord.__cvLitterRefresh=true}
  if(typeof window.savePuppy==='function'&&!window.savePuppy.__cvLitterRefresh){const old=window.savePuppy;window.savePuppy=function(){const a=currentDog(),r=old.apply(this,arguments);redraw(a);return r};window.savePuppy.__cvLitterRefresh=true}
}
install();setInterval(install,1000);
})();