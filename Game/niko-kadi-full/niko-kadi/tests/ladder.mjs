import * as E from '../www/js/engine.js';
import { BOTS, chooseAction, applyAction } from '../www/js/bots.js';
function rngFrom(seed){ let a=seed|0; return ()=>{ a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
function game(order, seed, rules={}){ const rng=rngFrom(seed); const s=E.newGame({players:order.map(b=>({name:b.name,bot:b})),rules,seed}); let n=0; while(!s.over&&n++<3000){ const a=chooseAction(s,s.players[s.cur].bot.L,rng); applyAction(s,a);} return s.over; }
const M=+process.env.M||400;
const pairs=[[5,0],[5,2],[5,4],[4,1],[3,1],[2,0],[4,0],[3,2]];
for(const [x,y] of pairs){ let w=0,d=0,niko=0; for(let g=0;g<M;g++){ const order=g%2?[BOTS[y],BOTS[x]]:[BOTS[x],BOTS[y]]; const o=game(order,9000+g); if(!o) continue; d++; if(order[o.winner]===BOTS[x]) w++; if(o.reason==='niko') niko++; }
 console.log(`${BOTS[x].name.padEnd(12)} (${BOTS[x].power}) vs ${BOTS[y].name.padEnd(12)} (${BOTS[y].power}): ${(100*w/d).toFixed(0)}%  niko-finishes ${(100*niko/d).toFixed(0)}%`); }
