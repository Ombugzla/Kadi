import * as E from '../www/js/engine.js';
import { BOTS, chooseAction, applyAction } from '../www/js/bots.js';
function rngFrom(seed){ let a=seed|0; return ()=>{ a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
const RAND={name:'Random',L:{...BOTS[0].L,blunder:1}};
const ALWAYSTAKE={name:'Taker',L:{...BOTS[0].L,blunder:1,takeOnly:true}};
function game(order, seed){ const rng=rngFrom(seed); const s=E.newGame({players:order.map(b=>({name:b.name,bot:b})),seed}); let n=0; while(!s.over&&n++<3000){ const b=s.players[s.cur].bot; let a; if(b.L.takeOnly){ const sm=E.summary(s); a= sm.canAccept?{type:'accept'}: sm.canTake?{type:'take'}:{type:'pass'}; } else a=chooseAction(s,b.L,rng); applyAction(s,a);} return s.over; }
for(const [A,B] of [[BOTS[5],RAND],[BOTS[0],RAND],[BOTS[5],ALWAYSTAKE],[RAND,ALWAYSTAKE]]){ let w=0,d=0; for(let g=0;g<600;g++){ const order=g%2?[B,A]:[A,B]; const o=game(order,100+g); if(!o)continue; d++; if(order[o.winner]===A)w++; } console.log(A.name,'vs',B.name,(100*w/d).toFixed(0)+'%'); }
