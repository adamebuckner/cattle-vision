(function setupHerdCollapse(){
  const herd=document.getElementById('herd');
  if(!herd)return;
  const panel=herd.closest('.panel');
  const head=panel?.querySelector('.herd-head');
  if(!head)return;
  const SPECIAL=new Set(['Livestock Guardian Dog','Horse']);
  let collapsed=false;
  try{
    const stored=localStorage.getItem('cv2-herd-collapsed');
    collapsed=stored===null?true:stored==='1';
  }catch(error){console.error('Herd collapse preference could not be read; showing the herd.',error)}
  const controls=document.createElement('div');
  controls.style.display='flex';controls.style.gap='8px';controls.style.flexWrap='wrap';controls.style.alignItems='center';
  const existingAdd=head.querySelector('.greenbtn');if(existingAdd)controls.appendChild(existingAdd);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='softbtn';toggle.dataset.herdCollapseToggle='1';controls.appendChild(toggle);head.appendChild(controls);
  const summary=document.createElement('div');summary.className='muted';summary.style.marginTop='8px';summary.style.display='none';herd.insertAdjacentElement('beforebegin',summary);
  function countCattle(){return (typeof cattle!=='undefined'&&Array.isArray(cattle))?cattle.filter(a=>!SPECIAL.has(a.sex)).length:Number(document.getElementById('totalN')?.textContent||0)}
  function update(){const count=countCattle();herd.style.display=collapsed?'none':'';summary.style.display=collapsed?'block':'none';summary.textContent=collapsed?`${count} cattle hidden — tap Show Herd to view pictures and records.`:'';toggle.textContent=collapsed?'Show Herd':'Hide Herd';toggle.setAttribute('aria-expanded',String(!collapsed))}
  toggle.addEventListener('click',()=>{collapsed=!collapsed;try{localStorage.setItem('cv2-herd-collapsed',collapsed?'1':'0')}catch(error){console.error(error)}update();if(!collapsed&&typeof window.render==='function')window.render()});
  const search=document.getElementById('search');if(search)search.addEventListener('input',()=>{if(search.value.trim()&&collapsed){collapsed=false;try{localStorage.setItem('cv2-herd-collapsed','0')}catch(error){console.error(error)}update();if(typeof window.render==='function')window.render()}});
  const observer=new MutationObserver(update);const total=document.getElementById('totalN');if(total)observer.observe(total,{childList:true,subtree:true});update();
})();
