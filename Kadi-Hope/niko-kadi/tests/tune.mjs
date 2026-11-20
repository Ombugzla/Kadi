import * as E from '../www/js/engine.js';
import { BOTS, DEFAULT_W, chooseAction, applyAction } from '../www/js/bots.js';
function rngFrom(seed){ let a=seed|0; return ()=>{ a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
const base=BOTS[5];
function game(order, seed){ const rng=rngFrom(seed); const s=E.newGame({players:order.map((b,i)=>({name:'p'+i,bot:b})),seed}); let n=0; while(!s.over&&n++<3000){ applyAction(s,chooseAction(s,s.players[s.cur].bot.L,rng)); } return s.over; }
function fitness(W, G, seed0){ const cand={L:{...base.L,W}}; const ref={L:{...base.L,W:DEFAULT_W}};
  let sc=0; 
  for(let g=0;g<G;g++){ // 1v1
    const order=g%2?[ref,cand]:[cand,ref]; const o=game(order,seed0+g); if(o&&order[o.winner]===cand) sc+=1/ G; }
  let sc4=0; for(let g=0;g<G;g++){ const pos=g%4; const order=[ref,ref,ref,ref]; order[pos]=cand; const o=game(order,seed0+7000+g); if(o&&order[o.winner]===cand) sc4+=1/G; }
  return (sc-0.5)+(sc4-0.25)*2; }
let best={...DEFAULT_W}, bf=0; const G=+process.env.G||500;
const keys=Object.keys(DEFAULT_W);
let rng=rngFrom(42);
for(let it=0; it<(+process.env.IT||40); it++){
  const cand={...best};
  const k1=keys[(rng()*keys.length)|0], k2=keys[(rng()*keys.length)|0];
  for(const k of [k1,k2]) cand[k]=Math.max(0, cand[k]*(0.5+rng()*1.2));
  const f=fitness(cand,G,200000+it*13);
  // re-evaluate on fresh seeds to avoid noise: accept only if still better
  const f2=fitness(cand,G,400000+it*17);
  const tot=(f+f2)/2;
  if(tot>bf){ best=cand; bf=tot; console.log('it',it,'fitness',tot.toFixed(3),k1,k2); }
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(best).map(([k,v])=>[k,+v.toFixed(2)]))));
