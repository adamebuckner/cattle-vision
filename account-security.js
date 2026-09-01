(function(){
const URL='https://rtyiqggxruwejqqyqtmv.supabase.co';
const KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
let sb=null;
function client(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
function addButton(){
  const body=document.getElementById('cloudBody');
  if(!body||document.getElementById('cvChangePasswordBtn'))return;
  const signOut=[...body.querySelectorAll('button')].find(b=>b.textContent.trim()==='Sign Out');
  if(!signOut)return;
  const b=document.createElement('button');
  b.id='cvChangePasswordBtn';b.type='button';b.className='softbtn';
  b.style.cssText='margin-top:10px;width:100%';b.textContent='Change Password';
  b.onclick=openPassword;
  signOut.parentNode.insertBefore(b,signOut);
}
function openPassword(){
  if(document.getElementById('cvPasswordBox'))return;
  const body=document.getElementById('cloudBody');if(!body)return;
  const box=document.createElement('div');box.id='cvPasswordBox';
  box.style.cssText='margin-top:12px;padding:14px;border:1px solid #cfe0d2;background:#f7faf7;border-radius:10px';
  box.innerHTML='<b>Choose a New Password</b><div class="muted" style="margin:6px 0 10px">You are already signed in, so you can set a new password here.</div><label>New Password</label><input id="cvChangePassword1" type="password" autocomplete="new-password" placeholder="New password"><label style="margin-top:8px">Confirm New Password</label><input id="cvChangePassword2" type="password" autocomplete="new-password" placeholder="Type it again"><button class="greenbtn" style="width:100%;margin-top:10px" id="cvSavePassword">Save New Password</button><button class="softbtn" style="width:100%;margin-top:8px" id="cvCancelPassword">Cancel</button>';
  document.getElementById('cvChangePasswordBtn').insertAdjacentElement('afterend',box);
  document.getElementById('cvCancelPassword').onclick=()=>box.remove();
  document.getElementById('cvSavePassword').onclick=savePassword;
}
async function savePassword(){
  const p=document.getElementById('cvChangePassword1')?.value||'';
  const p2=document.getElementById('cvChangePassword2')?.value||'';
  if(p.length<8)return alert('Use a password with at least 8 characters.');
  if(p!==p2)return alert('The two passwords do not match.');
  const c=client();if(!c)return alert('Cloud connection is not ready. Close Cloud, reopen it, and try again.');
  const {data:{session}}=await c.auth.getSession();
  if(!session)return alert('Your sign-in session has expired. Please sign in again before changing the password.');
  const btn=document.getElementById('cvSavePassword');if(btn){btn.disabled=true;btn.textContent='Saving…'}
  const {error}=await c.auth.updateUser({password:p});
  if(btn){btn.disabled=false;btn.textContent='Save New Password'}
  if(error)return alert('Password was not changed: '+error.message);
  document.getElementById('cvPasswordBox')?.remove();
  alert('Password changed successfully.');
}
const obs=new MutationObserver(addButton);obs.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target?.id==='cloudBtn'||e.target?.id==='cloudMobileBtn')setTimeout(addButton,100)});
setTimeout(addButton,500);
})();