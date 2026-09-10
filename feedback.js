(function(){
  if(window.__cvFeedbackInstalled)return;window.__cvFeedbackInstalled=true;
  const URL='https://rtyiqggxruwejqqyqtmv.supabase.co';
  const KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
  const VISITOR_KEY='cv2-anon-visitor-id';
  const SESSION_KEY='cv2-analytics-session-id';
  let rec=null,listening=false,client=null;
  function el(id){return document.getElementById(id)}
  function rid(){return (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
  function visitorId(){let v='';try{v=localStorage.getItem(VISITOR_KEY)||'';if(!v){v=rid();localStorage.setItem(VISITOR_KEY,v)}}catch{v=rid()}return v}
  function sessionId(){let v='';try{v=sessionStorage.getItem(SESSION_KEY)||'';if(!v){v=rid();sessionStorage.setItem(SESSION_KEY,v)}}catch{v=rid()}return v}
  function getClient(){if(client)return client;if(window.supabase?.createClient){client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}return null}
  function categorize(text){const t=(text||'').toLowerCase();if(/bug|broken|won't|wont|doesn't|doesnt|error|crash|not working|problem/.test(t))return 'Bug / Problem';if(/confus|hard to|don't understand|dont understand|where do|how do/.test(t))return 'Confusing / Hard to Use';if(/idea|should|could|would like|add|feature|wish/.test(t))return 'Idea / Feature Request';return 'General Feedback'}
  function summarize(){const text=el('feedbackText').value.trim();const cat=categorize(text);el('feedbackCategory').value=cat;const parts=[];if(text)parts.push(text);if(el('feedbackScreen').value.trim())parts.push('Where in app: '+el('feedbackScreen').value.trim());el('feedbackPreview').textContent=parts.join('\n\n')||'Your spoken or typed feedback will appear here.';}
  function openFeedback(){el('feedbackModal').classList.remove('hidden');setTimeout(()=>el('feedbackText').focus(),100);}
  function closeFeedback(){if(rec&&listening)try{rec.stop()}catch{}listening=false;el('feedbackModal').classList.add('hidden')}
  function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){el('feedbackHelp').textContent='Direct voice capture is not available in this browser. Tap the feedback box and use the microphone on your phone keyboard to dictate, then tap Prepare Feedback.';el('feedbackText').focus();return;}if(listening){try{rec.stop()}catch{}return;}rec=new SR();rec.lang='en-US';rec.continuous=true;rec.interimResults=true;let base=el('feedbackText').value.trim();rec.onstart=()=>{listening=true;el('feedbackVoiceBtn').textContent='Stop Listening';el('feedbackHelp').textContent='Listening… talk normally about what worked, what did not, or what you would change.'};rec.onresult=e=>{let final='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const s=e.results[i][0].transcript;if(e.results[i].isFinal)final+=s+' ';else interim+=s;}if(final){base=(base+' '+final).trim();el('feedbackText').value=base;summarize()}el('feedbackLive').textContent=interim?('Hearing: '+interim):''};rec.onerror=()=>{el('feedbackHelp').textContent='Voice capture stopped. You can keep typing or use the phone keyboard microphone.'};rec.onend=()=>{listening=false;el('feedbackVoiceBtn').textContent='Talk Feedback';el('feedbackLive').textContent=''};try{rec.start()}catch{}}
  async function fallbackShare(msg){try{if(navigator.share){await navigator.share({title:'Cattle Vision Feedback',text:msg});return true;}if(navigator.clipboard){await navigator.clipboard.writeText(msg);alert('Feedback copied. Paste it into a text or email to send it.');return true;}}catch(e){if(e&&e.name==='AbortError')return true;}try{const ta=document.createElement('textarea');ta.value=msg;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('Feedback copied. Paste it into a text or email to send it.');return true}catch{return false}}
  async function sendFeedback(){
    summarize();
    const text=el('feedbackText').value.trim();if(!text)return alert('Say or type some feedback first.');
    const cat=el('feedbackCategory').value,where=el('feedbackScreen').value.trim();
    const msg=`Cattle Vision Tester Feedback\nCategory: ${cat}${where?`\nWhere in app: ${where}`:''}\n\n${text}\n\nSent from Cattle Vision test app.`;
    const btn=el('feedbackShare');if(btn){btn.disabled=true;btn.textContent='Sending…'}
    try{
      let c=getClient();
      if(!c){await new Promise(r=>setTimeout(r,500));c=getClient()}
      if(c){
        const {error}=await c.rpc('submit_app_feedback',{p_visitor_id:visitorId(),p_session_id:sessionId(),p_category:cat,p_screen:where,p_message:text});
        if(!error){
          el('feedbackText').value='';el('feedbackScreen').value='';el('feedbackPreview').textContent='Your spoken or typed feedback will appear here.';
          el('feedbackHelp').textContent='Feedback sent to Cattle Vision. Thank you.';
          alert('Feedback sent. It is now in the Cattle Vision feedback inbox.');
          closeFeedback();return;
        }
        console.warn('Direct feedback submission unavailable',error);
      }
      const shared=await fallbackShare(msg);if(!shared)alert('Feedback could not be sent automatically. Please copy the text and send it manually.');
    }finally{if(btn){btn.disabled=false;btn.textContent='Send Feedback'}}
  }
  const css=document.createElement('link');css.rel='stylesheet';css.href='feedback.css?v=2';document.head.appendChild(css);
  const btn=document.createElement('button');btn.type='button';btn.className='feedback-fab';btn.textContent='Send Feedback';btn.onclick=openFeedback;document.body.appendChild(btn);
  const modal=document.createElement('div');modal.id='feedbackModal';modal.className='modal hidden';modal.innerHTML=`<div class="sheet feedback-sheet"><div class="row"><div><h2>Send Feedback</h2><div class="muted">Talk naturally. Cattle Vision turns your voice into text, categorizes it, and sends it into the tester feedback inbox.</div></div><button class="softbtn" type="button" id="feedbackClose">Close</button></div><div class="feedback-voice-row"><button class="greenbtn" type="button" id="feedbackVoiceBtn">Talk Feedback</button><span id="feedbackHelp" class="muted">Say what you liked, what did not work, or what you would change.</span></div><div id="feedbackLive" class="feedback-live"></div><label>Feedback</label><textarea id="feedbackText" rows="7" placeholder="Example: I was trying to move 12 cows to another pasture and the button was hard to find..."></textarea><div class="grid2"><div><label>Where in the app? (optional)</label><input id="feedbackScreen" placeholder="Pastures, bulk photos, animal record..."></div><div><label>Category</label><select id="feedbackCategory"><option>General Feedback</option><option>Bug / Problem</option><option>Confusing / Hard to Use</option><option>Idea / Feature Request</option></select></div></div><button class="softbtn" type="button" id="feedbackPrepare">Prepare Feedback</button><div id="feedbackPreview" class="feedback-preview">Your spoken or typed feedback will appear here.</div><button class="greenbtn" style="width:100%" type="button" id="feedbackShare">Send Feedback</button><div class="muted feedback-note">Feedback sends directly into Cattle Vision. If direct submission is unavailable, the iPhone Share sheet or clipboard is used as a backup. If direct microphone capture is unavailable, use the microphone on the iPhone keyboard.</div></div>`;document.body.appendChild(modal);
  el('feedbackClose').onclick=closeFeedback;el('feedbackVoiceBtn').onclick=startVoice;el('feedbackPrepare').onclick=summarize;el('feedbackShare').onclick=sendFeedback;el('feedbackText').addEventListener('input',summarize);el('feedbackScreen').addEventListener('input',summarize);
  window.openFeedback=openFeedback;
})();