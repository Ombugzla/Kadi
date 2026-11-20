// Tiny indirection so screens, the table and main.js can navigate without importing each other.
let impl = { go() {}, start() {} };
export const setRouter = (o) => Object.assign(impl, o);
export const go = (tab) => impl.go(tab);
export const startGame = (game, opts) => impl.start(game, opts);

// Back-button stack: the innermost handler gets the Android back press first.
const stack = [];
export const pushBack = (fn) => { stack.push(fn); return () => { const i = stack.indexOf(fn); if (i >= 0) stack.splice(i, 1); }; };
export const handleBack = () => { const fn = stack[stack.length - 1]; if (fn) { fn(); return true; } return false; };
