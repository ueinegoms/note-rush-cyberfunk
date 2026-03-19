import {nd} from './constants.js';
import {playNote} from './audio.js';

// Unified piano builder.
// `active`   — array of note ids that are highlighted/interactive.
// `allScale` — full scale range (determines which octaves are shown).
// `onKey`    — optional callback(id, element). When set, active keys become
//              selectable answer keys (tap = play + select). dataset.note is
//              set so the caller can query keys later.
export function buildRefPiano(active, allScale, onKey = null) {
  const CHROM = CHROMATIC;
  const scaleChrom = CHROM.filter(k=>k.id&&allScale.includes(k.id));
  if (!scaleChrom.length) return document.createElement('div');
  const minOct=Math.min(...scaleChrom.map(k=>k.oct)), maxOct=Math.max(...scaleChrom.map(k=>k.oct));
  const range=CHROM.filter(k=>k.oct>=minOct&&k.oct<=maxOct);
  const whites=range.filter(k=>!k.isB);
  const isNarrow = window.innerWidth <= 480;
  const GAP=2, WW=isNarrow?30:42, WH=isNarrow?88:112, BW=isNarrow?18:22, BH=isNarrow?53:68;
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
    btn.style.cssText=`left:${x}px;width:${WW}px;height:${WH}px;`;
    if(isActive&&k.id){
      if(onKey) btn.dataset.note = k.id;
      const n=nd(k.id);
      const lbEl=document.createElement('div');
      lbEl.className='wlbl';
      lbEl.textContent=n.lb.replace(/(₃|₄|₅)/,'\n$1');
      btn.appendChild(lbEl);
    }
    if(k.id){
      const n=nd(k.id);
      if(n){
        if(onKey && isActive){
          // Answer mode: deferred play, selection callback
          let _tapped=false;
          btn.addEventListener('mousedown',()=>{playNote(n.f,.7); btn.classList.add('pressed');});
          btn.addEventListener('mouseup',()=>btn.classList.remove('pressed'));
          btn.addEventListener('mouseleave',()=>btn.classList.remove('pressed'));
          btn.addEventListener('click',()=>onKey(k.id,btn));
          btn.addEventListener('touchstart',e=>{e.preventDefault(); btn.classList.add('pressed');},{passive:false});
          btn.addEventListener('touchend',e=>{e.preventDefault(); btn.classList.remove('pressed'); const w=btn.closest('.pianow'); if(w&&w.dataset.scrolling==='1')return; if(!_tapped){_tapped=true; playNote(n.f,.7); onKey(k.id,btn); setTimeout(()=>_tapped=false,350);}},{passive:false});
        } else {
          // Reference mode: just play on press
          const rel=()=>{ btn.classList.remove('pressed'); };
          btn.addEventListener('mousedown',()=>{playNote(n.f,.55); btn.classList.add('pressed');});
          btn.addEventListener('mouseup',rel);
          btn.addEventListener('mouseleave',rel);
          btn.addEventListener('touchstart',e=>{e.preventDefault(); btn.classList.add('pressed');},{passive:false});
          btn.addEventListener('touchend',e=>{e.preventDefault(); rel(); const w=btn.closest('.pianow'); if(w&&w.dataset.scrolling==='1')return; playNote(n.f,.55);},{passive:false});
        }
      }
    }
    piano.appendChild(btn);
  });

  range.filter(k=>k.isB).forEach(k=>{
    const lwi=whites.findIndex(w=>w.oct===k.oct&&w.pc===k.pc-1); if(lwi<0)return;
    const bx=lwi*(WW+GAP)+WW*.63;
    const btn=document.createElement('div'); btn.className='bkey';
    btn.style.cssText=`left:${bx}px;top:0;width:${BW}px;height:${BH}px;`;
    const rel=()=>{ btn.classList.remove('pressed'); };
    btn.addEventListener('mousedown',()=>{playNote(k.f,.55); btn.classList.add('pressed');}); btn.addEventListener('mouseup',rel); btn.addEventListener('mouseleave',rel);
    btn.addEventListener('touchstart',e=>{e.preventDefault(); btn.classList.add('pressed');},{passive:false});
    btn.addEventListener('touchend',e=>{e.preventDefault(); rel(); const w=btn.closest('.pianow'); if(w&&w.dataset.scrolling==='1')return; playNote(k.f,.55);},{passive:false});
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
