// adapted from previous scores.js, now as a module

// ══════════════════════════════════════════════
//  SUPABASE CONFIG + LEADERBOARD
// ══════════════════════════════════════════════
export const SUPABASE_URL    = 'https://fuccjqbiyqelafkcsrcf.supabase.co';
export const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2NqcWJpeXFlbGFma2NzcmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjU2NTYsImV4cCI6MjA4NzY0MTY1Nn0.bqzQcbIbPWXUP60DKIDE-4WoeNvqqejXRhaPtFkfBHY';
export const SUPABASE_TABLE  = 'leaderboard'; // nome da tabela
export const SB_ENABLED = SUPABASE_URL.indexOf('SEU-PROJETO') === -1;

export async function sbFetch(path, opts = {}) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(opts.headers || {})
    },
    ...opts
  });
  if (!res.ok) throw new Error('SB ' + res.status);
  return res.json();
}

function threeDaysAgo() {
  return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
}

export async function getLeaderboard() {
  if (!SB_ENABLED) return getLocalLB();
  try {
    return await sbFetch(
      `${SUPABASE_TABLE}?select=name,score&created_at=gte.${threeDaysAgo()}&order=score.desc&limit=5`
    );
  }
  catch { return getLocalLB(); }
}

export async function submitScore(name, score) {
  if (!SB_ENABLED) { saveLocalLB(name, score); return; }
  try {
    // Just insert — entries age out of the leaderboard naturally after 7 days.
    await sbFetch(SUPABASE_TABLE, { method: 'POST', body: JSON.stringify({ name, score }) });
  } catch {
    saveLocalLB(name, score);
  }
}

export function getLocalLB() {
  try {
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const all = JSON.parse(localStorage.getItem('nr_lb') || '[]');
    return all
      .filter(r => !r.created_at || new Date(r.created_at).getTime() >= cutoff)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch { return []; }
}

export function saveLocalLB(name, score) {
  try {
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const all = JSON.parse(localStorage.getItem('nr_lb') || '[]');
    all.push({ name, score, created_at: new Date().toISOString() });
    // keep only last-3-days entries, capped at 5 by score
    const pruned = all
      .filter(r => !r.created_at || new Date(r.created_at).getTime() >= cutoff)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    localStorage.setItem('nr_lb', JSON.stringify(pruned));
  } catch {}
}

// ══════════════════════════════════════════════
//  LEADERBOARD RENDERING
// ══════════════════════════════════════════════
export async function renderLeaderboard(container, hlName = null, hlScore = null) {
  if (!container) return;
  container.innerHTML = `<div class="lb-loading">CARREGANDO RANKING...</div>`;
  let rows;
  try { rows = await getLeaderboard(); } catch { rows = []; }
  container.innerHTML = '';
  if (!rows || rows.length === 0) {
    const e = document.createElement('div'); e.className = 'lb-empty'; e.textContent = 'NENHUMA PONTUAÇÃO AINDA';
    container.appendChild(e);
    return;
  }
  rows.slice(0,5).forEach((row,i)=>{
    const div=document.createElement('div');
    const isNew=hlName&&row.name===hlName&&row.score===hlScore;
    div.className='lb-row'+(i===0?' top1':'')+(isNew?' new-entry':'');
    const nameEl=document.createElement('span');nameEl.className='lb-name';nameEl.textContent=row.name;
    div.innerHTML=`<span class="lb-rank">${i+1}</span>`;
    div.appendChild(nameEl);
    const sc=document.createElement('span');sc.className='lb-score';sc.textContent='x'+row.score;
    div.appendChild(sc);
    container.appendChild(div);
  });
}

// ══════════════════════════════════════════════
//  NAME ENTRY — arcade 3-character UI
// ══════════════════════════════════════════════
export function buildNameEntry(combo,onSubmit,onSkip){
  const wrap=document.createElement('div');wrap.className='name-entry';
  const h3=document.createElement('h3');h3.textContent='SALVAR NO RANKING';wrap.appendChild(h3);

  const NAME_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?'.split('');
  const NAME_LEN=3;
  const chars=new Array(NAME_LEN).fill('A');
  let activeIdx=0;

  const charsRow=document.createElement('div');charsRow.className='name-chars';
  const cells=[];
  for(let i=0;i<NAME_LEN;i++){
    const c=document.createElement('div');
    c.className='name-char'+(i===activeIdx?' active':'');
    c.textContent=chars[i];
    c.addEventListener('click',()=>{activeIdx=i;updateDisplay();});
    cells.push(c);charsRow.appendChild(c);
  }
  wrap.appendChild(charsRow);

  const arrows=document.createElement('div');arrows.className='char-arrows';
  const up=document.createElement('button');up.className='carrow';up.textContent='▲';
  const down=document.createElement('button');down.className='carrow';down.textContent='▼';
  const left=document.createElement('button');left.className='carrow';left.textContent='◀';
  const right=document.createElement('button');right.className='carrow';right.textContent='▶';

  arrows.appendChild(up);arrows.appendChild(down);
  arrows.appendChild(left);arrows.appendChild(right);
  wrap.appendChild(arrows);

  function updateDisplay(){
    cells.forEach((c,i)=>{
      c.textContent=chars[i];
      c.className='name-char'+(i===activeIdx?' active':'');
    });
  }

  function stepChar(delta){
    const cur=chars[activeIdx];
    let idx=NAME_ALPHABET.indexOf(cur);
    if(idx<0)idx=0;
    idx=(idx+delta+NAME_ALPHABET.length)%NAME_ALPHABET.length;
    chars[activeIdx]=NAME_ALPHABET[idx];
    updateDisplay();
  }

  up.addEventListener('click',()=>stepChar(1));
  down.addEventListener('click',()=>stepChar(-1));
  left.addEventListener('click',()=>{activeIdx=(activeIdx-1+NAME_LEN)%NAME_LEN;updateDisplay();});
  right.addEventListener('click',()=>{activeIdx=(activeIdx+1)%NAME_LEN;updateDisplay();});

  const sb=document.createElement('button');sb.className='btn submit-btn';sb.textContent='✓ ENVIAR';
  sb.addEventListener('click',()=>{const val=chars.join('').trim()||'???';onSubmit(val);});
  const sk=document.createElement('button');sk.className='btn btn-ghost skip-btn';sk.textContent='pular';sk.addEventListener('click',onSkip);
  wrap.appendChild(sb);wrap.appendChild(sk);

  const keyHandler=e=>{
    if(!wrap.isConnected){window.removeEventListener('keydown',keyHandler);return;}
    if(e.key==='ArrowUp'){e.preventDefault();stepChar(1);}
    else if(e.key==='ArrowDown'){e.preventDefault();stepChar(-1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();activeIdx=(activeIdx-1+NAME_LEN)%NAME_LEN;updateDisplay();}
    else if(e.key==='ArrowRight'){e.preventDefault();activeIdx=(activeIdx+1)%NAME_LEN;updateDisplay();}
    else if(/^[a-z0-9!?]$/i.test(e.key)){
      const ch=e.key.toUpperCase();
      if(NAME_ALPHABET.includes(ch)){
        chars[activeIdx]=ch;
        activeIdx=(activeIdx+1)%NAME_LEN;
        updateDisplay();
      }
    }else if(e.key==='Enter'){
      sb.click();
    }
  };
  window.addEventListener('keydown',keyHandler);

  updateDisplay();
  return wrap;
}
