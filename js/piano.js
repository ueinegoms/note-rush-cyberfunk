import {nd} from './constants.js';
import {playNote} from './audio.js';

// Build a piano keyboard element. `activeNotes` is an array of note ids
// that should be highlighted/interactive. `onKey(id,element)` is callback for
// when the user presses a key. if `disAll` is true all keys are disabled.
export function buildPiano(activeNotes, onKey, disAll = false) {
  const activeChrom = CHROMATIC.filter(k => k.id && activeNotes.includes(k.id));
  if (!activeChrom.length) return document.createElement('div');
  const minOct = Math.min(...activeChrom.map(k => k.oct));
  const maxOct = Math.max(...activeChrom.map(k => k.oct));
  const range = CHROMATIC.filter(k => k.oct >= minOct && k.oct <= maxOct);
  const whites = range.filter(k => !k.isB);
  const isNarrow = window.innerWidth <= 480;
  const GAP = 2, WW = isNarrow ? 30 : 42, WH = isNarrow ? 88 : 112;
  const totalW = whites.length * (WW + GAP);
  const wrap = document.createElement('div'); wrap.className = 'pianow';
  const piano = document.createElement('div'); piano.className = 'piano';
  piano.style.width = totalW + 'px'; piano.style.height = WH + 'px';

  whites.forEach((k, wi) => {
    const isActive = k.id && activeNotes.includes(k.id);
    const btn = document.createElement('div');
    btn.className = 'wkey' + (disAll ? ' dis' : '') + (k.id && !isActive ? ' inactive' : '');
    btn.style.cssText = `left:${wi*(WW+GAP)}px;width:${WW}px;`;
    if (k.id) btn.dataset.note = k.id;
    if (isActive && k.id) {
      const n = nd(k.id);
      btn.innerHTML = `<div class="wlbl">${n.lb.replace(/(₃|₄|₅)/,'\n$1')}</div>`;
    }
    if (!disAll && isActive && k.id) {
      const n = nd(k.id);
      let _tapped = false;
      btn.addEventListener('touchstart', e=>{e.preventDefault(); playNote(n.f,.7); btn.classList.add('pressed');},{passive:false});
      btn.addEventListener('touchend', e=>{e.preventDefault(); btn.classList.remove('pressed'); if(!_tapped){_tapped=true; onKey(k.id,btn); setTimeout(()=>_tapped=false,350);}},{passive:false});
      btn.addEventListener('mousedown', ()=>{playNote(n.f,.7); btn.classList.add('pressed');});
      btn.addEventListener('mouseup',   ()=>btn.classList.remove('pressed'));
      btn.addEventListener('mouseleave',()=>btn.classList.remove('pressed'));
      btn.addEventListener('click', ()=>onKey(k.id, btn));
    }
    piano.appendChild(btn);
  });

  range.filter(k=>k.isB).forEach(k => {
    const lwi = whites.findIndex(w=>w.oct===k.oct&&w.pc===k.pc-1);
    if (lwi<0) return;
    const bx = lwi*(WW+GAP)+WW*0.6;
    const btn = document.createElement('div');
    btn.className = 'bkey' + (disAll?' dis':'');
    btn.style.cssText = `left:${bx}px;top:0;`;
    if (!disAll) {
      btn.addEventListener('touchstart', e=>{e.preventDefault(); playNote(k.f,.7); btn.classList.add('pressed');},{passive:false});
      btn.addEventListener('touchend', e=>{e.preventDefault(); btn.classList.remove('pressed');},{passive:false});
      btn.addEventListener('mousedown', ()=>{playNote(k.f,.7); btn.classList.add('pressed');});
      btn.addEventListener('mouseup',   ()=>btn.classList.remove('pressed'));
      btn.addEventListener('mouseleave',()=>btn.classList.remove('pressed'));
    }
    piano.appendChild(btn);
  });
  wrap.appendChild(piano);
  return wrap;
}

// reference-piano builder used by `ui.appendRefPiano`
export function buildRefPiano(active, allScale) {
  const CHROM = CHROMATIC;
  const scaleChrom = CHROM.filter(k=>k.id&&allScale.includes(k.id));
  if (!scaleChrom.length) return document.createElement('div');
  const minOct=Math.min(...scaleChrom.map(k=>k.oct)), maxOct=Math.max(...scaleChrom.map(k=>k.oct));
  const range=CHROM.filter(k=>k.oct>=minOct&&k.oct<=maxOct);
  const whites=range.filter(k=>!k.isB);
  const isNarrow = window.innerWidth <= 480;
  const GAP=2, WW=isNarrow?30:42, WH=isNarrow?88:112;
  const totalW=whites.length*(WW+GAP);
  const wrap=document.createElement('div'); wrap.className='pianow';
  const piano=document.createElement('div'); piano.className='piano';
  piano.style.width=totalW+'px'; piano.style.height=WH+'px';

  whites.forEach((k,wi)=>{
    const isActive=k.id&&active.includes(k.id);
    const inScale=k.id&&allScale.includes(k.id);
    const x=wi*(WW+GAP);
    const btn=document.createElement('div');
    // ref-upcoming = in scale but locked; ref-inactive = outside scale entirely
    const colorClass = isActive ? '' : inScale ? 'ref-upcoming' : 'ref-inactive';
    btn.className='wkey'+( colorClass?' '+colorClass:'')+(isActive?'':!inScale?' inactive':'');
    btn.style.cssText=`left:${x}px;width:${WW}px;`;
    if(isActive&&k.id){
      const n=nd(k.id);
      const lbEl=document.createElement('div');
      lbEl.className='wlbl';
      lbEl.textContent=n.lb.replace(/(₃|₄|₅)/,'\n$1');
      btn.appendChild(lbEl);
    }
    if(k.id){
      const n=nd(k.id);
      if(n){
        const press=()=>{ playNote(n.f,.55); btn.classList.add('pressed'); };
        const rel=()=>{ btn.classList.remove('pressed'); };
        btn.addEventListener('mousedown',press);
        btn.addEventListener('mouseup',rel);
        btn.addEventListener('mouseleave',rel);
        btn.addEventListener('touchstart',e=>{e.preventDefault();press();},{passive:false});
        btn.addEventListener('touchend',e=>{e.preventDefault();rel();},{passive:false});
      }
    }
    piano.appendChild(btn);
  });

  range.filter(k=>k.isB).forEach(k=>{
    const lwi=whites.findIndex(w=>w.oct===k.oct&&w.pc===k.pc-1); if(lwi<0)return;
    const bx=lwi*(WW+GAP)+WW*.63;
    const btn=document.createElement('div'); btn.className='bkey';
    btn.style.cssText=`left:${bx}px;top:0;`;
    const press=()=>{ playNote(k.f,.55); btn.classList.add('pressed'); };
    const rel=()=>{ btn.classList.remove('pressed'); };
    btn.addEventListener('mousedown',press); btn.addEventListener('mouseup',rel); btn.addEventListener('mouseleave',rel);
    btn.addEventListener('touchstart',e=>{e.preventDefault();press();},{passive:false});
    btn.addEventListener('touchend',e=>{e.preventDefault();rel();},{passive:false});
    piano.appendChild(btn);
  });

  wrap.appendChild(piano);
  return wrap;
}

// supply chromatic data (private export but needed by reference builder)
export const CHROMATIC = [
  {id:'Dó3', pc:0, oct:3,isB:false,f:130.81},{id:null,pc:1, oct:3,isB:true, f:138.59},
  {id:'Ré3', pc:2, oct:3,isB:false,f:146.83},{id:null,pc:3, oct:3,isB:true, f:155.56},
  {id:'Mi3', pc:4, oct:3,isB:false,f:164.81},
  {id:'Fá3', pc:5, oct:3,isB:false,f:174.61},{id:null,pc:6, oct:3,isB:true, f:185.00},
  {id:'Sol3',pc:7, oct:3,isB:false,f:196.00},{id:null,pc:8, oct:3,isB:true, f:207.65},
  {id:'Lá3', pc:9, oct:3,isB:false,f:220.00},{id:null,pc:10,oct:3,isB:true, f:233.08},
  {id:'Si3', pc:11,oct:3,isB:false,f:246.94},
  {id:'Dó4', pc:0, oct:4,isB:false,f:261.63},{id:null,pc:1, oct:4,isB:true, f:277.18},
  {id:'Ré4', pc:2, oct:4,isB:false,f:293.66},{id:null,pc:3, oct:4,isB:true, f:311.13},
  {id:'Mi4', pc:4, oct:4,isB:false,f:329.63},
  {id:'Fá4', pc:5, oct:4,isB:false,f:349.23},{id:null,pc:6, oct:4,isB:true, f:369.99},
  {id:'Sol4',pc:7, oct:4,isB:false,f:392.00},{id:null,pc:8, oct:4,isB:true, f:415.30},
  {id:'Lá4', pc:9, oct:4,isB:false,f:440.00},{id:null,pc:10,oct:4,isB:true, f:466.16},
  {id:'Si4', pc:11,oct:4,isB:false,f:493.88},
  {id:'Dó5', pc:0, oct:5,isB:false,f:523.25},{id:null,pc:1, oct:5,isB:true, f:554.37},
  {id:'Ré5', pc:2, oct:5,isB:false,f:587.33},{id:null,pc:3, oct:5,isB:true, f:622.25},
  {id:'Mi5', pc:4, oct:5,isB:false,f:659.25},
  {id:'Fá5', pc:5, oct:5,isB:false,f:698.46},{id:null,pc:6, oct:5,isB:true, f:739.99},
  {id:'Sol5',pc:7, oct:5,isB:false,f:783.99},
];
