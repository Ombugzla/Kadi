import * as E from '../www/js/engine.js';
import { BOTS, chooseAction, applyAction, seqChoosePick, seqChooseDispose } from '../www/js/bots.js';
import { newSeqGame, seqPick, seqDispose } from '../www/js/sequence.js';

function rngFrom(seed){ let a=seed|0; return ()=>{ a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }

function playNiko(bots, rules, seed){
  const rng=rngFrom(seed);
  const s=E.newGame({players:bots.map(b=>({name:b.name,bot:b})),rules,seed});
  let steps=0, stats={take:0, place:0};
  while(!s.over){
    if(++steps>4000) return {stuck:true, s};
    const L=s.players[s.cur].bot.L;
    const a=chooseAction(s,L,rng);
    const r=applyAction(s,a);
    if(!r.ok){ return {error:`bad action ${JSON.stringify(a)} -> ${r.reason}`, s}; }
    stats[a.type]=(stats[a.type]||0)+1;
    // invariants
    const all=[...s.draw,...s.discard,...s.players.flatMap(p=>p.hand)];
    if(new Set(all).size!==all.length) return {error:'duplicate cards', s};
    if(all.length!==54) return {error:'card count '+all.length, s};
  }
  return {winner:s.over.winner, reason:s.over.reason, steps, stats};
}

const N=+process.env.N||200;
let stuck=0, errors=0, wins={}, reasons={}, totalSteps=0, played=0;
const rulesets=[{}, {flow:true}, {specialJK:true}, {liberal:true}, {flow:true,specialJK:true,liberal:true}];
for(let g=0; g<N; g++){
  const n=2+(g%3);
  const bots=[]; for(let i=0;i<n;i++) bots.push(BOTS[(g*3+i*5)%BOTS.length]);
  const r=playNiko(bots, rulesets[g%rulesets.length], 1000+g);
  if(r.stuck){stuck++; if(stuck<3) console.log('STUCK', g, E.ctx(r.s), r.s.players.map(p=>p.hand.map(E.cardName).join(' ')), E.cardName(E.top(r.s)), r.s.pending, r.s.demand, r.s.threat);}
  else if(r.error){errors++; console.log('ERR',g,r.error);}
  else {played++; totalSteps+=r.steps; reasons[r.reason]=(reasons[r.reason]||0)+1;}
}
console.log(`niko: ${played} finished, ${stuck} stuck, ${errors} errors, avg steps ${(totalSteps/Math.max(1,played)).toFixed(0)}`, reasons);

// strength ladder: 2-player games, tiers head to head
function duel(a,b,games){ let aw=0,done=0; for(let g=0;g<games;g++){ const order=g%2? [b,a]:[a,b]; const r=playNiko(order,{}, 5000+g); if(r.winner===undefined) continue; done++; if(order[r.winner]===a) aw++; } return `${a.name} beat ${b.name}: ${aw}/${done}`; }
const M=+process.env.M||60;
console.log(duel(BOTS[5],BOTS[0],M)); console.log(duel(BOTS[4],BOTS[1],M)); console.log(duel(BOTS[3],BOTS[1],M)); console.log(duel(BOTS[5],BOTS[3],M));

// sequence
let sd=0, sst=0, sw={};
for(let g=0; g<300; g++){
  const rng=rngFrom(g);
  const n=2+(g%3);
  const s=newSeqGame({players:Array.from({length:n},(_,i)=>({name:'b'+i,bot:BOTS[(g+i*3)%BOTS.length]})),seed:g});
  let steps=0;
  while(!s.over && steps<2000){ steps++; const L=s.players[s.cur].bot.L;
    if(s.phase==='pick'){ const r=seqPick(s, seqChoosePick(s,L,rng)); if(!r.ok) throw new Error(r.reason); }
    else { const r=seqDispose(s, seqChooseDispose(s,L,rng)); if(!r.ok) throw new Error(r.reason); } }
  if(s.over){ sd++; sst+=steps; sw[s.over.pattern]=(sw[s.over.pattern]||0)+1; }
}
console.log(`sequence: ${sd}/300 finished, avg steps ${(sst/Math.max(1,sd)).toFixed(0)}`, sw);
