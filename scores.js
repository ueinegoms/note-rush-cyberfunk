// ══════════════════════════════════════════════
//  SUPABASE CONFIG + LEADERBOARD
// ══════════════════════════════════════════════
const SUPABASE_URL    = 'https://fuccjqbiyqelafkcsrcf.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2NqcWJpeXFlbGFma2NzcmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjU2NTYsImV4cCI6MjA4NzY0MTY1Nn0.bqzQcbIbPWXUP60DKIDE-4WoeNvqqejXRhaPtFkfBHY';
const SUPABASE_TABLE  = 'leaderboard'; // nome da tabela
const SB_ENABLED = SUPABASE_URL.indexOf('SEU-PROJETO') === -1;

async function sbFetch(path,opts={}){
  const res=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
    headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Content-Type':'application/json','Prefer':'return=representation',...(opts.headers||{})},
    ...opts
  });
  if(!res.ok)throw new Error('SB '+res.status);
  return res.json();
}
async function getLeaderboard(){
  if(!SB_ENABLED)return getLocalLB();
  try{return await sbFetch(`${SUPABASE_TABLE}?select=name,score&order=score.desc&limit=5`);}
  catch{return getLocalLB();}
}
async function submitScore(name,score){
  if(!SB_ENABLED){saveLocalLB(name,score);return;}
  try{
    await sbFetch(SUPABASE_TABLE,{method:'POST',body:JSON.stringify({name,score})});
    const all=await sbFetch(`${SUPABASE_TABLE}?select=id,score&order=score.desc`);
    if(all.length>5)for(const r of all.slice(5))await sbFetch(`${SUPABASE_TABLE}?id=eq.${r.id}`,{method:'DELETE'});
  }catch{saveLocalLB(name,score);}
}
function getLocalLB(){try{return JSON.parse(localStorage.getItem('nr_lb')||'[]');}catch{return[];}}
function saveLocalLB(name,score){
  let lb=getLocalLB();lb.push({name,score});
  lb.sort((a,b)=>b.score-a.score);lb=lb.slice(0,5);
  localStorage.setItem('nr_lb',JSON.stringify(lb));
}

// ══════════════════════════════════════════════
//  LEADERBOARD RENDERING
// ══════════════════════════════════════════════
async function renderLeaderboard(container,hlName=null,hlScore=null){
  container.innerHTML=`<div class="lb-loading">CARREGANDO RANKING...</div>`;
  let rows;try{rows=await getLeaderboard();}catch{rows=[];}
  container.innerHTML='';
  const t=document.createElement('div');t.className='lb-title';t.textContent='🏆 TOP 5';container.appendChild(t);
  if(!rows||rows.length===0){
    const e=document.createElement('div');e.className='lb-empty';e.textContent='NENHUMA PONTUAÇÃO AINDA';container.appendChild(e);return;
  }
  rows.slice(0,5).forEach((row,i)=>{
    const div=document.createElement('div');
    const isNew=hlName&&row.name===hlName&&row.score===hlScore;
    div.className='lb-row'+(i===0?' top1':'')+(isNew?' new-entry':'');
    // Render name directly — supports emoji and unicode
    const nameEl=document.createElement('span');nameEl.className='lb-name';nameEl.textContent=row.name;
    div.innerHTML=`<span class="lb-rank${i===0?' r1':''}">${['🥇','🥈','🥉','4','5'][i]}</span>`;
    div.appendChild(nameEl);
    const sc=document.createElement('span');sc.className='lb-score';sc.textContent='x'+row.score;
    div.appendChild(sc);
    container.appendChild(div);
  });
}

// ══════════════════════════════════════════════
//  NAME ENTRY — supports emoji & special chars
// ══════════════════════════════════════════════
function buildNameEntry(combo,onSubmit,onSkip){
  const wrap=document.createElement('div');wrap.className='name-entry';
  const h3=document.createElement('h3');h3.textContent='SALVAR NO RANKING';wrap.appendChild(h3);

  // Single text input — supports any Unicode, emoji picker on mobile
  const inputRow=document.createElement('div');inputRow.style.cssText='display:flex;gap:.5rem;align-items:center;width:100%;max-width:280px;';
  const inp=document.createElement('input');
  inp.type='text';
  inp.maxLength=8; // up to 8 chars / emoji
  inp.placeholder='SEU NOME 🎵';
  inp.style.cssText=`flex:1;padding:.65rem .8rem;border-radius:8px;border:2.5px solid var(--orange);background:#fff;
    font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--text);outline:none;text-align:center;
    min-height:50px;`;
  inp.addEventListener('input',()=>{
    // trim to 8 grapheme clusters (handles emoji)
    const seg=[...new Intl.Segmenter().segment(inp.value)];
    if(seg.length>8)inp.value=seg.slice(0,8).map(s=>s.segment).join('');
  });
  inputRow.appendChild(inp);
  wrap.appendChild(inputRow);

  const sb=document.createElement('button');sb.className='submit-btn';sb.textContent='✓ ENVIAR';
  sb.addEventListener('click',()=>{
    const val=(inp.value||'???').trim()||'???';
    onSubmit(val);
  });
  const sk=document.createElement('button');sk.className='skip-btn';sk.textContent='pular';sk.addEventListener('click',onSkip);
  wrap.appendChild(sb);wrap.appendChild(sk);
  setTimeout(()=>inp.focus(),100);
  return wrap;
}

