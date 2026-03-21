// basic geometry and note definitions
export const LS = 33; // line spacing
export const BY = 173; // baseline y-coordinate
export const SW = 500; // staff width
export const SH = 345; // staff height
export const NX = 270; // note x position

export const AN = [
  {id:'Dó3', s:-14, lb:'Dó₃', lB:'DÓ₃', f:130.81},
  {id:'Ré3', s:-13, lb:'Ré₃', lB:'RÉ₃', f:146.83},
  {id:'Mi3', s:-12, lb:'Mi₃', lB:'MI₃', f:164.81},
  {id:'Fá3', s:-11, lb:'Fá₃', lB:'FÁ₃', f:174.61},
  {id:'Sol3',s:-10, lb:'Sol₃',lB:'SOL₃',f:196.00},
  {id:'Lá3', s:-9,  lb:'Lá₃', lB:'LÁ₃', f:220.00},
  {id:'Si3', s:-8,  lb:'Si₃', lB:'SI₃', f:246.94},
  {id:'Dó4', s:-7,  lb:'Dó₄', lB:'DÓ₄', f:261.63},
  {id:'Ré4', s:-6,  lb:'Ré₄', lB:'RÉ₄', f:293.66},
  {id:'Mi4', s:-5,  lb:'Mi₄', lB:'MI₄', f:329.63},
  {id:'Fá4', s:-4,  lb:'Fá₄', lB:'FÁ₄', f:349.23},
  {id:'Sol4',s:-3,  lb:'Sol₄',lB:'SOL₄',f:392.00},
  {id:'Lá4', s:-2,  lb:'Lá₄', lB:'LÁ₄', f:440.00},
  {id:'Si4', s:-1,  lb:'Si₄', lB:'SI₄', f:493.88},
  {id:'Dó5', s:0,   lb:'Dó₅', lB:'DÓ₅', f:523.25},
  {id:'Ré5', s:1,   lb:'Ré₅', lB:'RÉ₅', f:587.33},
  {id:'Mi5', s:2,   lb:'Mi₅', lB:'MI₅', f:659.25},
  {id:'Fá5', s:3,   lb:'Fá₅', lB:'FÁ₅', f:698.46},
  {id:'Sol5',s:4,   lb:'Sol₅',lB:'SOL₅',f:783.99},
];

// NOTE SETS — each tier is a proper prefix of the next so unlocks
// progress seamlessly when the player exhausts a smaller scale.
export const NS = {
  basic:    ['Mi4','Fá4','Sol4','Lá4','Si4','Dó5','Ré5','Mi5','Fá5','Sol5'],
  extended: ['Mi4','Fá4','Sol4','Lá4','Si4','Dó5','Ré5','Mi5','Fá5','Sol5','Ré4','Dó4','Si3'],
  full:     ['Mi4','Fá4','Sol4','Lá4','Si4','Dó5','Ré5','Mi5','Fá5','Sol5','Ré4','Dó4','Si3','Lá3','Sol3','Fá3','Mi3','Ré3','Dó3'],
};

export function nd(id) {
  return AN.find(n => n.id === id);
}
