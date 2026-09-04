(function(){
if(window.__cvNoTagHerdCountInstalled)return;window.__cvNoTagHerdCountInstalled=true;
const SPECIAL=new Set(['Livestock Guardian Dog','Horse']);
function coreAnimals(){return (typeof cattle!=='undefined'&&Array.isArray(cattle)?cattle:[]).filter(a=>!SPECIAL.has(a?.sex));}
function isNoTag(a){return !!a&&(a.noTag===true||!String(a.tag||'').trim()||String(a.tag||'').trim().toUpperCase()==='N-T');}
function update(){
  const total=document.getElementById('totalN');if(!total)return;
  const core=coreAnimals(),nt=core.filter(isNoTag).length;
  const totalText=String(core.length);
  if(total.textContent!==totalText)total.textContent=totalText;
  const card=total.closest('.statcard');if(!card)return;
  let note=card.querySelector('.cv-nt-count');
  if(!note){note=document.createElement('small');note.className='cv-nt-count';note.style.display='block';note.style.marginTop='4px';card.appendChild(note)}
  const noteText=`${nt} N-T / waiting for tag included`;
  if(note.textContent!==noteText)note.textContent=noteText;
  note.title='Animals without a permanent tag still count toward Total Cattle.';
}
window.cvUpdateNoTagHerdCount=update;
update();
const target=document.getElementById('totalN');if(target)new MutationObserver(update).observe(target,{childList:true,characterData:true,subtree:true});
window.addEventListener('cv-local-change',()=>setTimeout(update,50));
})();
