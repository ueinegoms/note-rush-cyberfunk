// global game state and simple locking helpers
export let G = {
  phase: 0,
  streak: 0,
  unlocked: 2,
  combo: 0,
  bestCombo: 0,
  cur: null,
  ans: false,
  sopts: [],
  li: 0,
  pendingUnlock: false,
  _lastCombo: 0,
  lastNote: null
};

let _answerLock = false;
export function lockAnswer() {
  if (_answerLock) return false;
  _answerLock = true;
  return true;
}
export function unlockAnswer() {
  _answerLock = false;
}
