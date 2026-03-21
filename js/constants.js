// basic geometry and note definitions
export const LS = 33; // line spacing
export const BY = 173; // baseline y-coordinate
export const SW = 500; // staff width
export const SH = 345; // staff height
export const NX = 270; // note x position

export const AN = [
  {id:'Dó2', s:-21, lb:'Dó₂', lB:'DÓ₂', f:65.41},
  {id:'Ré2', s:-20, lb:'Ré₂', lB:'RÉ₂', f:73.42},
  {id:'Mi2', s:-19, lb:'Mi₂', lB:'MI₂', f:82.41},
  {id:'Fá2', s:-18, lb:'Fá₂', lB:'FÁ₂', f:87.31},
  {id:'Sol2',s:-17, lb:'Sol₂',lB:'SOL₂',f:98.00},
  {id:'Lá2', s:-16, lb:'Lá₂', lB:'LÁ₂', f:110.00},
  {id:'Si2', s:-15, lb:'Si₂', lB:'SI₂', f:123.47},
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
  {id:'Lá5', s:5,   lb:'Lá₅', lB:'LÁ₅', f:880.00},
  {id:'Si5', s:6,   lb:'Si₅', lB:'SI₅', f:987.77},
  {id:'Dó6', s:7,   lb:'Dó₆', lB:'DÓ₆', f:1046.50},
  {id:'Ré6', s:8,   lb:'Ré₆', lB:'RÉ₆', f:1174.66},
  {id:'Mi6', s:9,   lb:'Mi₆', lB:'MI₆', f:1318.51},
  {id:'Fá6', s:10,  lb:'Fá₆', lB:'FÁ₆', f:1396.91},
  {id:'Sol6',s:11,  lb:'Sol₆',lB:'SOL₆',f:1567.98},
  {id:'Lá6', s:12,  lb:'Lá₆', lB:'LÁ₆', f:1760.00},
  {id:'Si6', s:13,  lb:'Si₆', lB:'SI₆', f:1975.53},
  {id:'Dó7', s:14,  lb:'Dó₇', lB:'DÓ₇', f:2093.00},
  // Accidentals (flats)
  {id:'Réb2',s:-20, lb:'Ré♭₂',lB:'RÉ♭₂',f:69.30, acc:'♭'},
  {id:'Mib2',s:-19, lb:'Mi♭₂',lB:'MI♭₂',f:77.78, acc:'♭'},
  {id:'Solb2',s:-17,lb:'Sol♭₂',lB:'SOL♭₂',f:92.50, acc:'♭'},
  {id:'Láb2',s:-16, lb:'Lá♭₂',lB:'LÁ♭₂',f:103.83, acc:'♭'},
  {id:'Sib2',s:-15, lb:'Si♭₂',lB:'SI♭₂',f:116.54, acc:'♭'},
  {id:'Réb3',s:-13, lb:'Ré♭₃',lB:'RÉ♭₃',f:138.59, acc:'♭'},
  {id:'Mib3',s:-12, lb:'Mi♭₃',lB:'MI♭₃',f:155.56, acc:'♭'},
  {id:'Solb3',s:-10,lb:'Sol♭₃',lB:'SOL♭₃',f:185.00, acc:'♭'},
  {id:'Láb3',s:-9,  lb:'Lá♭₃',lB:'LÁ♭₃',f:207.65, acc:'♭'},
  {id:'Sib3',s:-8,  lb:'Si♭₃',lB:'SI♭₃',f:233.08, acc:'♭'},
  {id:'Réb4',s:-6,  lb:'Ré♭₄',lB:'RÉ♭₄',f:277.18, acc:'♭'},
  {id:'Mib4',s:-5,  lb:'Mi♭₄',lB:'MI♭₄',f:311.13, acc:'♭'},
  {id:'Solb4',s:-3, lb:'Sol♭₄',lB:'SOL♭₄',f:369.99, acc:'♭'},
  {id:'Láb4',s:-2,  lb:'Lá♭₄',lB:'LÁ♭₄',f:415.30, acc:'♭'},
  {id:'Sib4',s:-1,  lb:'Si♭₄',lB:'SI♭₄',f:466.16, acc:'♭'},
  {id:'Réb5',s:1,   lb:'Ré♭₅',lB:'RÉ♭₅',f:554.37, acc:'♭'},
  {id:'Mib5',s:2,   lb:'Mi♭₅',lB:'MI♭₅',f:622.25, acc:'♭'},
  {id:'Solb5',s:4,  lb:'Sol♭₅',lB:'SOL♭₅',f:739.99, acc:'♭'},
  {id:'Láb5',s:5,   lb:'Lá♭₅',lB:'LÁ♭₅',f:830.61, acc:'♭'},
  {id:'Sib5',s:6,   lb:'Si♭₅',lB:'SI♭₅',f:932.33, acc:'♭'},
  {id:'Réb6',s:8,   lb:'Ré♭₆',lB:'RÉ♭₆',f:1108.73, acc:'♭'},
  {id:'Mib6',s:9,   lb:'Mi♭₆',lB:'MI♭₆',f:1244.51, acc:'♭'},
  {id:'Solb6',s:11, lb:'Sol♭₆',lB:'SOL♭₆',f:1479.98, acc:'♭'},
  {id:'Láb6',s:12,  lb:'Lá♭₆',lB:'LÁ♭₆',f:1661.22, acc:'♭'},
  {id:'Sib6',s:13,  lb:'Si♭₆',lB:'SI♭₆',f:1864.66, acc:'♭'},
];

// SCALE TYPES — ordered by harmonic complexity (difficulty curve).
// Intervals are semitone offsets from root within one octave.
const CHROMATIC_NAMES = ['Dó','Réb','Ré','Mib','Mi','Fá','Solb','Sol','Láb','Lá','Sib','Si'];

export const SCALE_TYPES = [
  { name: 'Maior',              intervals: [0,2,4,5,7,9,11] },
  { name: 'Menor Natural',      intervals: [0,2,3,5,7,8,10] },
  { name: 'Pentatônica',        intervals: [0,2,4,7,9] },
  { name: 'Blues',               intervals: [0,3,5,6,7,10] },
  { name: 'Menor Harmônica',    intervals: [0,2,3,5,7,8,11] },
  { name: 'Menor Melódica',     intervals: [0,2,3,5,7,9,11] },
  { name: 'Diminuta',           intervals: [0,2,3,5,6,8,9,11] },
  { name: 'Alterada',           intervals: [0,1,3,4,6,8,10] },
];

// Build a scale's note IDs for a given type and octave count (1-5), rooted at C.
// Returns notes ordered center-out from octave 4 for progressive unlock.
export function buildScale(typeIdx, octaves) {
  const type = SCALE_TYPES[typeIdx];
  if (!type) return [];
  const ivs = type.intervals;

  // Determine octave range centered on 4
  // 1 oct → [4], 2 → [3,4], 3 → [3,4,5], 4 → [2,3,4,5], 5 → [2,3,4,5,6]
  const ranges = [[4],[3,4],[3,4,5],[2,3,4,5],[2,3,4,5,6]];
  const octs = ranges[Math.min(octaves, 5) - 1];

  // Generate all note IDs in this scale across the octave range, plus top Dó
  const ids = [];
  for (const oct of octs) {
    for (const semi of ivs) {
      const name = CHROMATIC_NAMES[semi];
      const id = name + oct;
      if (AN.find(n => n.id === id) && !ids.includes(id)) ids.push(id);
    }
  }
  // Always add the octave-closing root at the top
  const topOct = Math.max(...octs) + 1;
  const topId = 'Dó' + topOct;
  if (AN.find(n => n.id === topId) && !ids.includes(topId)) ids.push(topId);

  // Sort by distance from Si4 (B4) for progressive unlock
  const centerF = 493.88; // Si4
  ids.sort((a, b) => {
    const da = Math.abs(Math.log2(nd(a).f / centerF));
    const db = Math.abs(Math.log2(nd(b).f / centerF));
    return da - db;
  });
  return ids;
}

export function scaleName(typeIdx, octaves) {
  const t = SCALE_TYPES[typeIdx];
  return t ? `${t.name} — ${octaves} oitava${octaves > 1 ? 's' : ''}` : '';
}

export function nd(id) {
  return AN.find(n => n.id === id);
}
