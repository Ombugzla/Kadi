// Avatars. People are drawn as detailed portraits from a spec; the player can also pick a picture of an
// object, or upload their own photo.
//   skin, eyes ('round'|'almond'|'mono'), eyeColor, nose ('n'|'m'|'w'), lips ('t'|'m'|'f'), face ('oval'|'round'|'square'),
//   gender ('m'|'f'), hair (style), hairColor, beard ('full'|'stubble'|'mustache'|'goatee'), glasses, freckles, age (0..1),
//   top ('tee'|'collar'|'blazer'), shirt, bg
const P = (o) => ({ eyes: 'round', eyeColor: '#3a2316', nose: 'm', lips: 'm', face: 'oval', gender: 'm', top: 'tee', age: 0, ...o });
export const PHOTOS = ['amara', 'priya', 'luca', 'erik', 'viktor', 'imani', 'mei', 'layla'];
export const ANIME_AVATARS = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7'];
export const PLAYER_AVATARS = [
  ...PHOTOS.map((photo) => ({ photo })),
  ...ANIME_AVATARS.map((photo) => ({ photo })),
];

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (c) => '#' + c.map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
const shade = (h, k) => hex(rgb(h).map((v) => v * k));
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };

let uidN = 0;

function faceSVG(a) {
  const u = 'f' + (uidN++);
  const skin = a.skin, hair = a.hairColor || '#17110d', f = a.gender === 'f';
  const dark = lum(skin) < 0.4;
  const sk0 = mix(skin, '#ffffff', dark ? 0.12 : 0.18), sk2 = shade(skin, 0.78), sk3 = shade(skin, 0.55);
  const lipC = f ? mix(skin, dark ? '#7a1f3a' : '#c0405a', 0.55) : mix(skin, dark ? '#4a1a22' : '#9b4a4a', 0.5);
  const shirt = a.shirt;
  const hw = (f ? 10.8 : 11.8) + (a.face === 'round' ? 0.7 : 0);
  const jx = a.face === 'square' ? 6.2 : a.face === 'round' ? 5.2 : f ? 3.8 : 4.8;
  const jy = a.face === 'square' ? 40 : 38;
  const chin = a.face === 'square' ? 44 : 44.5;
  const facePath = `M${32 - hw} 27C${32 - hw} 15.500 26 12.500 32 12.500S${32 + hw} 15.500 ${32 + hw} 27C${32 + hw} ${jy} ${32 + jx} ${chin} 32 ${chin}S${32 - hw} ${jy} ${32 - hw} 27z`;
  const H = `url(#${u}h)`;
  let back = '', front = '';
  const curls = (cx, cy, rx, ry, a0, a1, n, r) => Array.from({ length: n }, (_, i) => {
    const t = (a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI / 180;
    return `<circle cx="${(cx + rx * Math.cos(t)).toFixed(1)}" cy="${(cy + ry * Math.sin(t)).toFixed(1)}" r="${r}" fill="${H}"/>`;
  }).join('');
  switch (a.hair) {
    case 'afro':
      back = `<circle cx="32" cy="21.500" r="19.500" fill="${H}"/>` + curls(32, 21.500, 18, 18, 0, 359, 26, 3.600);
      front = `<path d="M20 27c-.5-7 4.500-11.500 12-11.500S44.500 20 44 27c-1.500-5-5-8-12-8s-10.500 3-12 8z" fill="${H}"/>`;
      break;
    case 'curly':
      back = curls(32, 22, 14.500, 12, 170, 370, 14, 4.200) + curls(32, 24, 17, 14, 160, 380, 10, 3.600);
      front = `<path d="M20 27c0-8 5-12.500 12-12.500S44 19 44 27c-1.500-5-5-7.500-12-7.500S21.500 22 20 27z" fill="${H}"/>` + curls(32, 19, 11, 3, 190, 350, 8, 2.600);
      break;
    case 'braids':
      back = [16.500, 21, 43, 47.500].map((x) => `<rect x="${x - 2}" y="20" width="4" height="30" rx="2" fill="${H}"/>${[26, 31, 36, 41, 46].map((y) => `<path d="M${x - 2} ${y}l4 2" stroke="${shade(hair, 0.55)}" stroke-width=".7"/>`).join('')}`).join('');
      front = `<path d="M19.800 28C18.800 15 25 10.500 32 10.500S45.200 15 44.200 28c-1.200-6-5-9.800-12.200-9.800S21 22 19.800 28z" fill="${H}"/><path d="M32 11v8M26 12l1 7M38 12l-1 7" stroke="${shade(hair, 1.9)}" stroke-width=".6" opacity=".45"/>`;
      break;
    case 'long':
      back = `<path d="M19 30C15 12 25 6.500 32 6.500S49 12 45 30l2.500 24H16.500z" fill="${H}"/>`;
      front = `<path d="M20 29C19 15 25 10.500 32 10.500S45 15 44 29c-1-5.500-4-9-9-10.500-7 3-11.500 4-15 10.500z" fill="${H}"/><path d="M26 13c-3 4-4.500 9-5.500 16M38 13c3 4 4.500 9 5.500 16" stroke="${shade(hair, 1.8)}" stroke-width=".6" fill="none" opacity=".4"/>`;
      break;
    case 'wavy':
      back = `<path d="M18.500 30C15 12 25 6.500 32 6.500S49 12 45.500 30c2 5 .5 9 3.500 13-3 4-8 2-9 6-1-3-4-2.500-7.500-1.500C29 48 25 52 24 47c-3 2-6 0-7.500-3 3-4 1.500-9 2-14z" fill="${H}"/>`;
      front = `<path d="M20 29C19 15 25 10.500 32 10.500S45 15 44 29c-1.500-5-4-8-8.500-9.500-5.500 1.500-9.500 4-15.500 9.500z" fill="${H}"/><path d="M24 14c-3 5-3.500 10-4 15M40 14c2.500 5 3.500 10 4 15" stroke="${shade(hair, 1.9)}" stroke-width=".6" fill="none" opacity=".4"/>`;
      break;
    case 'bun':
      back = `<circle cx="32" cy="7.500" r="5.500" fill="${H}"/><path d="M30 5c1.500-1 3.500-1 5 0" stroke="${shade(hair, 1.8)}" stroke-width=".7" fill="none" opacity=".5"/>`;
      front = `<path d="M19.800 28C18.600 15 25 10.500 32 10.500S45.400 15 44.200 28c-1.500-6-4.500-9.500-12.200-9.500S21.300 22 19.800 28z" fill="${H}"/>`;
      break;
    case 'hijab':
      back = `<path d="M13 40C10 12 22 4.500 32 4.500S54 12 51 40l2.500 20h-43z" fill="${H}"/><path d="M18 30c-1 8 0 14 4 18M46 30c1 8 0 14-4 18" stroke="${shade(hair, 0.7)}" stroke-width=".8" fill="none" opacity=".5"/>`;
      front = `<path d="M19.500 24C19.500 14.500 25 11 32 11s12.500 3.500 12.500 13c-2-5-6-7-12.500-7S21.500 19 19.500 24z" fill="${H}"/><path d="M21 14c4-3 18-3 22 0" stroke="${shade(hair, 1.6)}" stroke-width=".8" fill="none" opacity=".5"/>`;
      break;
    case 'cap':
      front = `<path d="M19.500 22.500c0-8.500 5.500-12.800 12.500-12.800s12.500 4.300 12.500 12.800z" fill="${H}"/><rect x="17.500" y="20.800" width="29" height="3.400" rx="1.700" fill="${shade(hair, 0.78)}"/>`;
      break;
    case 'bald':
      front = `<ellipse cx="29" cy="15.500" rx="5" ry="2.200" fill="#fff" opacity=".2"/>`;
      break;
    case 'buzz':
      front = `<path d="M20.200 26.500C19.500 15.500 25 11.500 32 11.500s12.500 4 11.800 15c-1.300-5-4.500-8-11.800-8s-10.500 3-11.800 8z" fill="${hair}" opacity=".88"/>`;
      break;
    case 'sidepart':
      front = `<path d="M19.600 28C18 14 26 9.500 33 9.500s12 4.500 11.400 18.500c-.8-5.500-3.500-8.500-8-9.800-6 1.500-13 1.800-16.800 9.800z" fill="${H}"/><path d="M27 10.500c-1 3-3 6-6.500 9" stroke="${shade(hair, 1.9)}" stroke-width=".7" fill="none" opacity=".5"/><path d="M30 10c2 1 5 1.500 8 1" stroke="${shade(hair, 1.9)}" stroke-width=".6" fill="none" opacity=".4"/>`;
      break;
    default:
      front = `<path d="M19.600 28C18.600 14.500 25 10 32 10s13.400 4.500 12.400 18c-1.400-5.800-4.800-9-12.400-9s-11 3.200-12.400 9z" fill="${H}"/><path d="M24 13c4-2 9-2 13 0" stroke="${shade(hair, 1.9)}" stroke-width=".8" fill="none" opacity=".35" stroke-linecap="round"/>`;
  }
  const bf = `fill="${H}"`;
  let beard = '';
  if (a.beard === 'full') beard = `<path d="M20.500 30c.3 5 2 10 5.500 12.800 2 1.500 4.200 2 6 2s4-.5 6-2c3.500-2.800 5.200-7.800 5.500-12.800-1.600 4.500-4.500 6.500-7.500 7-1.500-1-2.500-1.200-4-1.200s-2.500.2-4 1.200c-3-.5-5.900-2.500-7.500-7z" ${bf}/>`;
  else if (a.beard === 'goatee') beard = `<path d="M27 38.800c1.500-1.300 3-1.600 5-1.600s3.500.3 5 1.600c-.2 3.500-2 6-5 6s-4.800-2.500-5-6z" ${bf}/><path d="M27.500 36.800q4.500-1.800 9 0" stroke="${hair}" stroke-width="1.300" fill="none" stroke-linecap="round"/>`;
  else if (a.beard === 'mustache') beard = `<path d="M26.500 37.200q5.500-3 11 0-5.500-.7-11 0z" ${bf}/>`;
  else if (a.beard === 'stubble') beard = `<path d="M20.800 31c.5 6 2.500 10 5.500 12.200 2 1.300 4 1.800 5.700 1.800s3.700-.5 5.700-1.800c3-2.200 5-6.200 5.500-12.200-1.500 5-4.500 7-7.500 7.500-1.500-1.200-2.500-1.400-3.700-1.400s-2.200.2-3.700 1.400c-3-.5-6-2.500-7.500-7.500z" fill="${hair}" opacity=".32"/>`;
  const glasses = a.glasses
    ? `<g fill="#fff" fill-opacity=".12" stroke="#2b2420" stroke-width="1"><rect x="22" y="25.200" width="9" height="6.600" rx="2.800"/><rect x="33" y="25.200" width="9" height="6.600" rx="2.800"/></g><path d="M31 27.800h2" stroke="#2b2420" stroke-width="1"/><path d="M22 27l-2.500-.8M42 27l2.500-.8" stroke="#2b2420" stroke-width=".9"/><path d="M23 26.500l3 .2" stroke="#fff" stroke-width=".8" opacity=".5"/>`
    : '';
  const eyeShape = { round: [2.6, 1.8, 0], almond: [2.7, 1.5, 5], mono: [2.5, 1.2, 6] }[a.eyes || 'round'];
  const eye = (cx, side) => {
    const [rx, ry, tilt] = eyeShape, cy = 28.600, rot = -side * tilt;
    const lid = a.eyes === 'mono'
      ? `<path d="M${cx - rx - .2} ${cy - .3}q${rx + .2} ${-ry * 2.500} ${2 * rx + .4} 0" stroke="${sk3}" stroke-width="1" fill="none" stroke-linecap="round"/>`
      : `<path d="M${cx - rx - .2} ${cy + .1}q${rx + .2} ${-ry * 2.800} ${2 * rx + .4} 0" stroke="${sk3}" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M${cx - rx + .4} ${cy - ry - 1.300}q${rx - .4} -.9 ${2 * rx - .8} 0" stroke="${sk2}" stroke-width=".5" fill="none" opacity=".6"/>`;
    const lash = f ? `<path d="M${cx + side * (rx + .2)} ${cy - .2}l${side * 1.100} -.9" stroke="${sk3}" stroke-width=".7" stroke-linecap="round"/>` : '';
    return `<g transform="rotate(${rot} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#f7f2ea"/><circle cx="${cx}" cy="${cy + .1}" r="${Math.min(1.500, ry * .9)}" fill="${a.eyeColor}"/><circle cx="${cx}" cy="${cy + .1}" r=".65" fill="#050403"/><circle cx="${cx + .5}" cy="${cy - .4}" r=".38" fill="#fff"/>${lid}${lash}</g>`;
  };
  const bt = (f ? 1.1 : 1.8) + (a.age > 0.5 ? 0.2 : 0);
  const brows = f
    ? `<path d="M23.500 24.500q3.200-2.300 6.500-.8M34 23.700q3.300-1.500 6.500.8" stroke="${hair}" stroke-width="${bt}" fill="none" stroke-linecap="round" opacity=".9"/>`
    : `<path d="M23.300 24.800q3.300-1.800 6.700-.7M34 24.100q3.400-1.100 6.700.7" stroke="${hair}" stroke-width="${bt}" fill="none" stroke-linecap="round"/>`;
  const nw = { n: 1.500, m: 2.100, w: 2.900 }[a.nose || 'm'];
  const nose = `<path d="M32 27c-.3 3-.9 5.500-2 7.200" stroke="${sk3}" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".55"/>
<path d="M${32 - nw - .6} 35q.5 1.500 ${nw + .6} 1.300q${nw + .1} .2 ${nw + .6} -1.300" stroke="${sk3}" stroke-width=".9" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
<ellipse cx="${32 - nw * .55}" cy="35.700" rx=".55" ry=".35" fill="${sk3}" opacity=".7"/><ellipse cx="${32 + nw * .55}" cy="35.700" rx=".55" ry=".35" fill="${sk3}" opacity=".7"/>
<ellipse cx="32.200" cy="31.800" rx=".9" ry="2.600" fill="#fff" opacity="${dark ? .1 : .16}"/>`;
  const [lw, uh, lh] = { t: [3.600, .7, 1.100], m: [4, 1, 1.600], f: [4.400, 1.300, 2.100] }[a.lips || 'm'];
  const my = 39;
  const mouth = `<path d="M${32 - lw} ${my}q${lw * .5} ${-uh * 1.200} ${lw} ${-uh * .5} ${lw * .5} ${uh * .7} ${lw} ${uh * .5}-${lw} ${uh * .8}-${lw * 2} 0z" fill="${shade(lipC, 0.9)}"/><path d="M${32 - lw + .3} ${my + .1}q${lw - .3} ${lh * 1.700} ${2 * lw - .6} 0-${lw - .3} ${lh * .5}-${2 * lw - .6} 0z" fill="${lipC}"/><path d="M${32 - lw - .4} ${my - .2}q.4 .9 1.200 .9M${32 + lw + .4} ${my - .2}q-.4 .9 -1.200 .9" stroke="${sk3}" stroke-width=".6" fill="none" opacity=".6"/><ellipse cx="32" cy="${my + lh * .55 + .4}" rx="${lw * .35}" ry=".45" fill="#fff" opacity=".35"/>`;
  const wrinkles = a.age > 0.3 ? `<path d="M23 21.500q9-1.800 18 0M24.500 23.300q7.500-1.200 15 0" stroke="${sk3}" stroke-width=".45" fill="none" opacity="${.18 + a.age * .25}"/><path d="M20.600 29.500q-.8 1.200-.4 2.500M43.400 29.500q.8 1.200.4 2.500M28 40.500q-1.500 1.300-1.600 3M36 40.500q1.500 1.300 1.600 3" stroke="${sk3}" stroke-width=".5" fill="none" opacity="${.15 + a.age * .25}"/>` : '';
  const freckles = a.freckles ? Array.from({ length: 14 }, (_, i) => `<circle cx="${(i < 7 ? 24 + (i % 4) * 1.800 + (i > 3 ? 1.5 : 0) : 35.500 + ((i - 7) % 4) * 1.800)}" cy="${33 + ((i * 7) % 3) * 1.200}" r=".36" fill="#b0623a" opacity=".6"/>`).join('') : '';
  const light = lum(shirt) > 0.65;
  const line = shade(shirt, 0.6);
  const clothes = `<path d="M4 66c1.500-13 12-19 28-19s26.500 6 28 19z" fill="url(#${u}t)"/>`;
  const neck = `<path d="M27 37h10v10.500c0 3-2.300 5.500-5 5.500s-5-2.500-5-5.500z" fill="${sk2}"/>`;
  let collar = '';
  if (a.top === 'collar') collar = `<path d="M24.500 47.500c2 .5 4 3 5.500 6.200L26 56l-5.200-5.500z" fill="${mix(shirt, '#ffffff', 0.32)}" stroke="${line}" stroke-width=".6" stroke-linejoin="round"/><path d="M39.500 47.500c-2 .5-4 3-5.500 6.200L38 56l5.200-5.500z" fill="${mix(shirt, '#ffffff', 0.32)}" stroke="${line}" stroke-width=".6" stroke-linejoin="round"/><path d="M27.500 48c.8 3 2.500 4.800 4.500 5.500 2-.7 3.700-2.500 4.500-5.500-1.300 1.200-2.800 1.800-4.500 1.800s-3.200-.6-4.500-1.800z" fill="${skin}"/>`;
  else if (a.top === 'blazer') collar = `<path d="M27 47.500c1.500 4 3 7.500 5 11 2-3.500 3.500-7 5-11-1.500 1.500-3.200 2.200-5 2.200s-3.500-.7-5-2.200z" fill="#f3efe4" stroke="${line}" stroke-width=".4"/><path d="M25 46.500L32 61 21 63.500 19 52z" fill="${shade(shirt, 0.82)}" stroke="${line}" stroke-width=".6" stroke-linejoin="round"/><path d="M39 46.500L32 61l11 2.500L45 52z" fill="${shade(shirt, 0.82)}" stroke="${line}" stroke-width=".6" stroke-linejoin="round"/><path d="M28 48.500c1 2.800 2.500 4.500 4 5 1.500-.5 3-2.200 4-5-1.200.9-2.500 1.300-4 1.300s-2.800-.4-4-1.300z" fill="${skin}"/>`;
  else collar = `<path d="M25.500 47.200Q32 56.500 38.500 47.200c-1.500-.3-3-.5-6.500-.5s-5 .2-6.500.5z" fill="${skin}"/><path d="M25.500 47.200Q32 56.500 38.500 47.200" stroke="${line}" stroke-width=".9" fill="none"/>`;
  const faceHi = `<ellipse cx="28.500" cy="19" rx="5" ry="2.600" fill="#fff" opacity=".13"/><ellipse cx="25.200" cy="33.500" rx="3.200" ry="1.900" fill="#d9605a" opacity="${f ? .16 : .1}"/><ellipse cx="38.800" cy="33.500" rx="3.200" ry="1.900" fill="#d9605a" opacity="${f ? .16 : .1}"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
<defs>
<radialGradient id="${u}b" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="${mix(a.bg, '#ffffff', 0.35)}"/><stop offset="1" stop-color="${shade(a.bg, 0.72)}"/></radialGradient>
<radialGradient id="${u}s" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${sk0}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${sk2}"/></radialGradient>
<linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(hair, '#ffffff', lum(hair) > 0.4 ? 0.25 : 0.2)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${shade(hair, 0.6)}"/></linearGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(shirt, '#ffffff', light ? 0 : 0.12)}"/><stop offset="1" stop-color="${shade(shirt, 0.78)}"/></linearGradient>
</defs>
<rect width="64" height="64" fill="url(#${u}b)"/>
${back}
${clothes}${neck}
<ellipse cx="32" cy="43.500" rx="8.500" ry="2.600" fill="#000" opacity=".16"/>${collar}
<ellipse cx="${32 - hw - .3}" cy="30" rx="2" ry="3.300" fill="${sk2}"/><ellipse cx="${32 + hw + .3}" cy="30" rx="2" ry="3.300" fill="${sk2}"/>
<path d="${facePath}" fill="url(#${u}s)"/>
${faceHi}${freckles}${wrinkles}
${front}
${eye(27.200, -1)}${eye(36.800, 1)}${brows}
${nose}${beard}${mouth}${glasses}
</svg>`;
}

// ------------------------------------------------------------------ objects the player can pick
const g = (id, a, b, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rg = (id, a, b, cx = 0.35, cy = 0.3) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;

const OBJECTS = {
  moon: ['Moon', (u) => `<defs>${g(u + 'a', '#1c2b5a', '#0b1230', 0, 0, 0, 1)}${rg(u + 'm', '#fff6cf', '#e8c566')}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<g fill="#fff" opacity=".9"><circle cx="12" cy="14" r="1"/><circle cx="50" cy="10" r="1.300"/><circle cx="55" cy="30" r=".9"/><circle cx="16" cy="48" r=".9"/><circle cx="46" cy="52" r="1.100"/><circle cx="8" cy="30" r=".7"/></g>
<path d="M40 11a22 22 0 1 0 14 29 17 17 0 0 1-14-29z" fill="url(#${u}m)"/><circle cx="26" cy="38" r="2.500" fill="#d4ad4e" opacity=".35"/><circle cx="32" cy="46" r="1.600" fill="#d4ad4e" opacity=".3"/>`],
  mango: ['Mango juice', (u) => `<defs>${g(u + 'a', '#cfe6c9', '#9cc79a', 0, 0, 0, 1)}${g(u + 'j', '#ffcf3d', '#ff8c00', 0, 0, 0, 1)}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<ellipse cx="32" cy="57" rx="14" ry="2.500" fill="#000" opacity=".15"/>
<rect x="36" y="4" width="3.600" height="30" rx="1.500" fill="#e8574a" transform="rotate(14 37 20)"/><path d="M37.600 8l1.500 5M36.900 16l1.500 5" stroke="#fff" stroke-width="1.300" transform="rotate(14 37 20)"/>
<path d="M21.500 25.500h21l-2.500 28.300q-7.500 3-16 0z" fill="url(#${u}j)"/>
<path d="M21.500 25.500c3 1.800 18 1.800 21 0" stroke="#fff3b0" stroke-width="1.200" fill="none" opacity=".8"/>
<path d="M18.500 17h27l-3.600 38.300q-9.900 3.700-19.800 0z" fill="#fff" opacity=".28" stroke="#fff" stroke-width="1.100" stroke-linejoin="round"/>
<path d="M23 21l2.700 31" stroke="#fff" stroke-width="1.800" stroke-linecap="round" opacity=".6"/>
<g transform="translate(40 17) rotate(30)"><path d="M-9 0a9 9 0 0 1 18 0z" fill="#ff9d1a"/><path d="M-7 0a7 7 0 0 1 14 0z" fill="#ffd34d"/><path d="M0 0v-7M-3.500 0l-1.500-6M3.500 0l1.500-6" stroke="#ffe8a0" stroke-width=".6"/></g>`],
  art: ['Artwork', (u) => `<defs>${g(u + 'w', '#e9d2cc', '#c9a79d', 0, 0, 0, 1)}${g(u + 's', '#ffb27a', '#f6e2a0', 0, 0, 0, 1)}${g(u + 'f', '#f0cf6a', '#a8791f')}</defs><rect width="64" height="64" fill="url(#${u}w)"/>
<rect x="9" y="11" width="46" height="42" rx="2" fill="url(#${u}f)"/><rect x="13.500" y="15.500" width="37" height="33" fill="url(#${u}s)"/>
<circle cx="38" cy="29" r="6" fill="#fff4c9"/><path d="M13.500 40c8-8 14-9 20-4s12 3 17-3v15.500h-37z" fill="#6f9b78"/><path d="M13.500 44c9-5 15-3 21 0s11 1 16-2v6.500h-37z" fill="#3f6b57"/>
<path d="M13.500 15.500h37v33h-37z" fill="none" stroke="#7a5412" stroke-width=".8" opacity=".6"/>`],
  football: ['Football', (u) => `<defs>${g(u + 'a', '#58a65c', '#2f7a3b', 0, 0, 0, 1)}${rg(u + 'b', '#ffffff', '#cfd3d8')}<clipPath id="${u}c"><circle cx="32" cy="32" r="19"/></clipPath></defs><rect width="64" height="64" fill="url(#${u}a)"/>
<path d="M0 46h64" stroke="#fff" stroke-width="1" opacity=".25"/><ellipse cx="32" cy="54" rx="16" ry="2.500" fill="#000" opacity=".2"/>
<circle cx="32" cy="32" r="19" fill="url(#${u}b)"/><g clip-path="url(#${u}c)" fill="#20242a" stroke="#20242a" stroke-linejoin="round">
<path d="M32 24.500l7 5.200-2.700 8.300h-8.600L25 29.700z" stroke-width=".8"/>
<path d="M32 4l8 5-2 6h-12l-2-6z M54 22l2 8-5 5-6-3 1-8z M46 52l-5 3-7-3 1-7h10z M18 52l1-7h10l1 7-7 3z M10 22l8 2 1 8-6 3-5-5z" stroke-width=".8"/></g>
<path d="M32 24.500V15M39 29.700l7-4M36.300 38l5 6.500M27.700 38l-5 6.500M25 29.700l-7-4" stroke="#20242a" stroke-width="1.100"/>
<circle cx="32" cy="32" r="19" fill="none" stroke="#9aa0a8" stroke-width=".8"/><ellipse cx="25" cy="21" rx="5" ry="3" fill="#fff" opacity=".4" transform="rotate(-35 25 21)"/>`],
  basketball: ['Basketball', (u) => `<defs>${g(u + 'a', '#e6c48a', '#b88a4c', 0, 0, 0, 1)}${rg(u + 'b', '#ffa04a', '#d4560f')}<clipPath id="${u}c"><circle cx="32" cy="31" r="19"/></clipPath></defs><rect width="64" height="64" fill="url(#${u}a)"/>
<ellipse cx="32" cy="53" rx="15" ry="2.500" fill="#000" opacity=".22"/><circle cx="32" cy="31" r="19" fill="url(#${u}b)"/>
<g clip-path="url(#${u}c)" fill="none" stroke="#3b1b0a" stroke-width="1.300"><path d="M32 12v38M13 31h38"/><path d="M19 14c8 8 8 26 0 34M45 14c-8 8-8 26 0 34"/></g>
<ellipse cx="25" cy="20" rx="5" ry="3" fill="#fff" opacity=".28" transform="rotate(-35 25 20)"/>`],
  card: ['Playing card', (u) => `<defs>${g(u + 'a', '#2e7a47', '#1c4d3c', 0, 0, 0, 1)}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<g transform="rotate(-9 32 32)"><rect x="16" y="8" width="32" height="48" rx="4" fill="#000" opacity=".25" transform="translate(1.500 2)"/><rect x="16" y="8" width="32" height="48" rx="4" fill="#fffaf0"/>
<path d="M32 19c6 6.500 11 9.500 11 14 0 3.300-3 5-5.600 4.300-1.300-.4-2.200-1.100-2.800-2 .2 3 1 5.300 2.600 7h-10.400c1.600-1.700 2.400-4 2.600-7-.6.900-1.500 1.600-2.800 2-2.600.7-5.600-1-5.600-4.300 0-4.500 5-7.500 11-14z" fill="#1d1b1a"/>
<text x="19.500" y="18" font-family="Georgia,serif" font-weight="700" font-size="9" fill="#1d1b1a">A</text></g>`],
  cartoon: ['Cartoon', (u) => `<defs>${g(u + 'a', '#ffb3c7', '#ff86a8', 0, 0, 0, 1)}${rg(u + 'f', '#ffe36e', '#ffb81f')}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<circle cx="32" cy="34" r="22" fill="url(#${u}f)" stroke="#a9650d" stroke-width="1.500"/><path d="M28 12c0-4 4-6 6-4M33 12c1-4 5-5 7-2" stroke="#a9650d" stroke-width="1.800" fill="none" stroke-linecap="round"/>
<ellipse cx="24.500" cy="29" rx="5.500" ry="7" fill="#fff" stroke="#a9650d" stroke-width="1.200"/><ellipse cx="39.500" cy="29" rx="5.500" ry="7" fill="#fff" stroke="#a9650d" stroke-width="1.200"/>
<circle cx="26" cy="30.500" r="2.800" fill="#2a1a10"/><circle cx="38" cy="30.500" r="2.800" fill="#2a1a10"/><circle cx="26.800" cy="29.500" r=".9" fill="#fff"/><circle cx="38.800" cy="29.500" r=".9" fill="#fff"/>
<path d="M19 43q13 11 26 0z" fill="#7a2020" stroke="#a9650d" stroke-width="1.300" stroke-linejoin="round"/><path d="M26 48q6 4 12 0-2-3-6-3t-6 3z" fill="#ff6f7d"/><circle cx="17" cy="40" r="3.200" fill="#ff7a6a" opacity=".45"/><circle cx="47" cy="40" r="3.200" fill="#ff7a6a" opacity=".45"/>`],
  crown: ['Crown', (u) => `<defs>${g(u + 'a', '#6a4a9c', '#3a2766', 0, 0, 0, 1)}${g(u + 'c', '#ffe28a', '#d49a1d', 0, 0, 0, 1)}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<path d="M12 46L9 20l12 11 11-17 11 17 12-11-3 26z" fill="url(#${u}c)" stroke="#a8730f" stroke-width="1.200" stroke-linejoin="round"/><rect x="12" y="46" width="40" height="6" rx="2" fill="url(#${u}c)" stroke="#a8730f" stroke-width="1.200"/>
<circle cx="9" cy="19" r="2.800" fill="#ff6b6b"/><circle cx="32" cy="12.500" r="3" fill="#5ad2ff"/><circle cx="55" cy="19" r="2.800" fill="#ff6b6b"/><circle cx="22" cy="49" r="1.500" fill="#d94a4a"/><circle cx="32" cy="49" r="1.500" fill="#3ab4e6"/><circle cx="42" cy="49" r="1.500" fill="#d94a4a"/>`],
  rocket: ['Rocket', (u) => `<defs>${g(u + 'a', '#26346b', '#0e1433', 0, 0, 0, 1)}${g(u + 'r', '#ffffff', '#c6ccd8', 0, 0, 1, 0)}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<g fill="#fff" opacity=".85"><circle cx="10" cy="12" r="1"/><circle cx="52" cy="14" r="1.200"/><circle cx="56" cy="40" r=".8"/><circle cx="12" cy="42" r=".9"/><circle cx="24" cy="8" r=".7"/></g>
<g transform="rotate(40 32 32)"><path d="M32 6c8 8 9 22 7 34H25C23 28 24 14 32 6z" fill="url(#${u}r)"/><path d="M32 6c3 3 5.500 6.500 6.500 10h-13c1-3.500 3.500-7 6.500-10z" fill="#e8574a"/><circle cx="32" cy="26" r="4.200" fill="#5ac0ee" stroke="#8b95a8" stroke-width="1.300"/><path d="M25 32l-7 10 7-1zM39 32l7 10-7-1z" fill="#e8574a"/><path d="M28 41h8l-4 11z" fill="#ffb02e"/><path d="M30 41h4l-2 6z" fill="#fff1a8"/></g>`],
  cat: ['Cat', (u) => `<defs>${g(u + 'a', '#a8d5e8', '#7fb3cf', 0, 0, 0, 1)}${rg(u + 'f', '#ffc27a', '#e58d38')}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<path d="M13 30L12 9l15 9zM51 30l1-21-15 9z" fill="#e58d38"/><path d="M16 24l-.5-9 7 4zM48 24l.5-9-7 4z" fill="#ffb0a8"/>
<ellipse cx="32" cy="36" rx="21" ry="19" fill="url(#${u}f)"/><path d="M32 17v7M25 19l1 5M39 19l-1 5" stroke="#c4701f" stroke-width="1.600" stroke-linecap="round"/>
<ellipse cx="24" cy="33" rx="3.500" ry="4.200" fill="#fff6d8"/><ellipse cx="40" cy="33" rx="3.500" ry="4.200" fill="#fff6d8"/><ellipse cx="24" cy="33.500" rx="1.400" ry="3.200" fill="#1b1410"/><ellipse cx="40" cy="33.500" rx="1.400" ry="3.200" fill="#1b1410"/>
<path d="M29.500 40h5l-2.500 3z" fill="#e0707f"/><path d="M32 43c-1 3-4 3.500-6 2M32 43c1 3 4 3.500 6 2" stroke="#7a3d10" stroke-width="1.100" fill="none" stroke-linecap="round"/><path d="M6 38l12 2M6 45l12-2M58 38l-12 2M58 45l-12-2" stroke="#fff" stroke-width=".9" opacity=".8"/>`],
  sunflower: ['Sunflower', (u) => `<defs>${g(u + 'a', '#9fd8f2', '#d8f0fa', 0, 0, 0, 1)}${rg(u + 'c', '#7b4a22', '#3b210d', 0.5, 0.5)}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<path d="M32 40v24" stroke="#4c8a3c" stroke-width="3.500"/><path d="M32 54c-8-1-11-6-11-9 6 0 11 3 11 9z" fill="#5da349"/>
<g transform="translate(32 28)">${Array.from({ length: 14 }, (_, i) => `<ellipse cx="0" cy="-15" rx="4.200" ry="8" fill="${i % 2 ? '#ffc61a' : '#ffd84a'}" transform="rotate(${i * 25.7})"/>`).join('')}</g>
<circle cx="32" cy="28" r="9" fill="url(#${u}c)"/><g fill="#a9743a" opacity=".7"><circle cx="29" cy="25" r=".8"/><circle cx="34" cy="26" r=".8"/><circle cx="31" cy="30" r=".8"/><circle cx="35" cy="31" r=".8"/><circle cx="28" cy="29" r=".8"/></g>`],
  trophy: ['Trophy', (u) => `<defs>${g(u + 'a', '#ff9a85', '#e8664f', 0, 0, 0, 1)}${g(u + 't', '#ffe58f', '#d49a1d', 0, 0, 1, 0)}</defs><rect width="64" height="64" fill="url(#${u}a)"/>
<path d="M19 13c-8 0-9 12 1 16M45 13c8 0 9 12-1 16" fill="none" stroke="#c28a14" stroke-width="2.600" stroke-linecap="round"/>
<path d="M18 10h28v8c0 10-6 17-14 17s-14-7-14-17z" fill="url(#${u}t)" stroke="#b07d10" stroke-width="1.200" stroke-linejoin="round"/>
<path d="M28 34h8l1 10H27z" fill="url(#${u}t)" stroke="#b07d10" stroke-width="1.100"/><rect x="21" y="44" width="22" height="6" rx="1.500" fill="#7a4a22"/><rect x="17" y="50" width="30" height="5" rx="1.500" fill="#5c3517"/>
<path d="M32 15l2 4.200 4.600.6-3.400 3.100.9 4.500-4.100-2.300-4.100 2.300.9-4.500-3.400-3.100 4.600-.6z" fill="#fff6cf" opacity=".9"/><path d="M23 13v12" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4"/>`],
};
// Realistic renders: shaded, textured and lit, drawn with gradients and SVG lighting filters.
const noise = (id, f, oct, seed, mat) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="${oct}" seed="${seed}"/><feColorMatrix values="${mat}"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
const sphere = (u, r, cx, cy) => `<radialGradient id="${u}sh" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>`;
const REAL = {
  moon: ['Moon', (u) => `<defs>
<radialGradient id="${u}bg" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#1d2d54"/><stop offset="1" stop-color="#04060e"/></radialGradient>
<radialGradient id="${u}m" cx=".4" cy=".36" r=".78"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#ddd8c8"/><stop offset="1" stop-color="#8b8880"/></radialGradient>
<radialGradient id="${u}g" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#cfd9ff" stop-opacity=".4"/><stop offset="1" stop-color="#cfd9ff" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}l" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
${noise(u + 'n', '.11', 4, 7, '0 0 0 0 .3  0 0 0 0 .3  0 0 0 0 .32  0 0 0 1.6 -.55')}
<filter id="${u}b"><feGaussianBlur stdDeviation="1.1"/></filter>
<clipPath id="${u}c"><circle cx="32" cy="32" r="21"/></clipPath></defs>
<rect width="64" height="64" fill="url(#${u}bg)"/>
<g fill="#fff"><circle cx="9" cy="13" r=".6"/><circle cx="53" cy="9" r=".8"/><circle cx="57" cy="31" r=".5"/><circle cx="14" cy="52" r=".6"/><circle cx="49" cy="55" r=".7"/><circle cx="6" cy="33" r=".4"/><circle cx="26" cy="5" r=".4"/><circle cx="38" cy="60" r=".5"/></g>
<circle cx="32" cy="32" r="30" fill="url(#${u}g)"/><circle cx="32" cy="32" r="21" fill="url(#${u}m)"/>
<g clip-path="url(#${u}c)"><circle cx="32" cy="32" r="21" fill="#fff" filter="url(#${u}n)" opacity=".4"/>
<g filter="url(#${u}b)" fill="#77746d" opacity=".5"><ellipse cx="25" cy="25" rx="7" ry="5"/><ellipse cx="37" cy="23" rx="5" ry="4"/><ellipse cx="30" cy="36" rx="6" ry="4"/><ellipse cx="40" cy="35" rx="4" ry="5"/><ellipse cx="22" cy="37" rx="3" ry="3"/></g>
<g fill="none" stroke="#fff" opacity=".35"><circle cx="38" cy="44" r="2.600"/><circle cx="23" cy="45" r="1.800"/><circle cx="43" cy="28" r="1.500"/></g><g fill="#6f6c66" opacity=".3"><circle cx="38.400" cy="44.400" r="2.300"/><circle cx="23.300" cy="45.300" r="1.600"/></g>
<circle cx="32" cy="32" r="21" fill="url(#${u}l)"/></g>`],

  football: ['Football', (u) => `<defs>
<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb85a"/><stop offset="1" stop-color="#2f7a36"/></linearGradient>
<radialGradient id="${u}b" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e6e8ec"/><stop offset="1" stop-color="#b9bdc6"/></radialGradient>
${sphere(u, 19)}
${noise(u + 'g', '.9', 2, 2, '0 0 0 0 0  0 0 0 0 .25  0 0 0 0 0  0 0 0 .55 -.15')}
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.6"/></filter>
<clipPath id="${u}c"><circle cx="32" cy="31" r="19"/></clipPath></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><rect width="64" height="64" fill="#1c4d20" filter="url(#${u}g)" opacity=".6"/>
<path d="M0 50h64" stroke="#fff" stroke-width="1.200" opacity=".3"/>
<ellipse cx="33" cy="52" rx="16" ry="3" fill="#06200a" opacity=".5" filter="url(#${u}bl)"/>
<circle cx="32" cy="31" r="19" fill="url(#${u}b)"/>
<g clip-path="url(#${u}c)" fill="#1b1e24"><path d="M32 23.500l7 5.200-2.700 8.300h-8.600L25 28.700z"/>
<path d="M32 3l8.500 5-2 6.500h-13l-2-6.500zM55 20l2.500 9-5.500 5.500-6.500-3 1-9zM47 52l-6 3.500-7.500-3.500 1-7.500h11zM17 52l1-7.500h11l1 7.500-7.500 3.500zM9 20l9 2 1 9-6.500 3-5.500-5.500z"/></g>
<g stroke="#2a2e36" stroke-width="1" fill="none" opacity=".75"><path d="M32 23.500v-9M39 28.700l7-4.500M36.300 37l5 7M27.700 37l-5 7M25 28.700l-7-4.500"/></g>
<circle cx="32" cy="31" r="19" fill="url(#${u}sh)"/><ellipse cx="25" cy="20" rx="5.500" ry="3" fill="#fff" opacity=".55" transform="rotate(-35 25 20)"/>`],

  basketball: ['Basketball', (u) => `<defs>
<linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b27a"/><stop offset=".5" stop-color="#c99a5b"/><stop offset="1" stop-color="#8e6232"/></linearGradient>
<radialGradient id="${u}b" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#ff9a3c"/><stop offset=".55" stop-color="#e2631a"/><stop offset="1" stop-color="#9c3a0b"/></radialGradient>
${sphere(u, 19)}
${noise(u + 'p', '1.3', 2, 5, '0 0 0 0 .25  0 0 0 0 .08  0 0 0 0 0  0 0 0 1.2 -.35')}
${noise(u + 'w', '.02 .45', 3, 9, '0 0 0 0 .35  0 0 0 0 .2  0 0 0 0 .08  0 0 0 .9 -.25')}
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.6"/></filter>
<clipPath id="${u}c"><circle cx="32" cy="31" r="19"/></clipPath></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><rect width="64" height="64" fill="#fff" filter="url(#${u}w)" opacity=".5"/>
<ellipse cx="33" cy="52" rx="16" ry="3" fill="#2a1606" opacity=".55" filter="url(#${u}bl)"/>
<circle cx="32" cy="31" r="19" fill="url(#${u}b)"/><circle cx="32" cy="31" r="19" fill="#fff" filter="url(#${u}p)"/>
<g clip-path="url(#${u}c)" fill="none" stroke="#1f0d04" stroke-width="1.500"><path d="M32 11v40M12 31h40"/><path d="M19 14c8 8 8 26 0 34M45 14c-8 8-8 26 0 34"/></g>
<circle cx="32" cy="31" r="19" fill="url(#${u}sh)"/><ellipse cx="25" cy="20" rx="5" ry="2.800" fill="#fff" opacity=".4" transform="rotate(-35 25 20)"/>`],

  mango: ['Mango juice', (u) => `<defs>
<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9efe0"/><stop offset="1" stop-color="#b9c9a6"/></linearGradient>
<linearGradient id="${u}j" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd24a"/><stop offset=".6" stop-color="#ffa317"/><stop offset="1" stop-color="#e86f05"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a3200" stop-opacity=".45"/><stop offset=".25" stop-color="#fff" stop-opacity=".15"/><stop offset=".7" stop-color="#7a3200" stop-opacity="0"/><stop offset="1" stop-color="#7a3200" stop-opacity=".4"/></linearGradient>
<linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd23d"/><stop offset=".6" stop-color="#ff9a1f"/><stop offset="1" stop-color="#e5502a"/></linearGradient>
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><rect y="52" width="64" height="12" fill="#a98c62" opacity=".55"/>
<ellipse cx="33" cy="57" rx="15" ry="3" fill="#2a2010" opacity=".4" filter="url(#${u}bl)"/>
<rect x="37" y="3" width="3.600" height="31" rx="1.600" fill="#fff" transform="rotate(13 38 20)"/><path d="M38.200 6l1.600 5M37.400 15l1.600 5M36.600 24l1.600 5" stroke="#e24a3e" stroke-width="1.800" transform="rotate(13 38 20)"/>
<path d="M21 25h22l-2.400 29.300q-8.600 2.600-17.200 0z" fill="url(#${u}j)"/><path d="M21 25h22l-2.400 29.300q-8.600 2.600-17.200 0z" fill="url(#${u}s)"/>
<ellipse cx="32" cy="25" rx="11" ry="1.800" fill="#ffe27a" opacity=".85"/>
<g fill="#fff" opacity=".5"><rect x="25" y="29" width="8" height="7" rx="1.600" transform="rotate(-14 29 32)"/><rect x="33" y="35" width="7" height="7" rx="1.600" transform="rotate(18 36 38)"/></g>
<path d="M18.500 16.500h27l-3.700 38.800q-9.800 3.600-19.600 0z" fill="#fff" opacity=".16" stroke="#fff" stroke-width="1" stroke-opacity=".7" stroke-linejoin="round"/>
<path d="M22.500 20l2.800 32" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/><path d="M40.500 22l-1.500 24" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".5"/>
<g fill="#fff" opacity=".7"><circle cx="35" cy="45" r=".8"/><circle cx="27" cy="40" r=".6"/><circle cx="38" cy="50" r=".6"/><circle cx="29" cy="48" r=".7"/></g>
<g transform="translate(43 18) rotate(32)"><path d="M-9.500 0a9.500 9.500 0 0 1 19 0z" fill="#d9531e"/><path d="M-8 0a8 8 0 0 1 16 0z" fill="url(#${u}m)"/><path d="M-4 0a4 4 0 0 1 8 0z" fill="#ffe27a" opacity=".5"/><path d="M0 0v-7.500M-4 0l-2.200-6.200M4 0l2.200-6.200" stroke="#ffd98a" stroke-width=".5" opacity=".7"/></g>`],

  art: ['Artwork', (u) => `<defs>
<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe6d8"/><stop offset="1" stop-color="#cbbfae"/></linearGradient>
<linearGradient id="${u}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5d97c"/><stop offset=".3" stop-color="#b98a2a"/><stop offset=".6" stop-color="#f0cf6a"/><stop offset="1" stop-color="#7c5614"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5f9a"/><stop offset=".55" stop-color="#f0a46a"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
<radialGradient id="${u}d" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d0"/><stop offset="1" stop-color="#ffd28a"/></radialGradient>
${noise(u + 'c', '.7', 2, 4, '0 0 0 0 .2  0 0 0 0 .15  0 0 0 0 .1  0 0 0 .6 -.1')}
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.2"/></filter><clipPath id="${u}k"><rect x="14" y="15" width="36" height="34"/></clipPath></defs>
<rect width="64" height="64" fill="url(#${u}w)"/><rect x="11" y="14" width="46" height="44" rx="2" fill="#2a1d10" opacity=".4" filter="url(#${u}bl)"/>
<rect x="9" y="10" width="46" height="44" rx="1.500" fill="url(#${u}f)"/><rect x="12" y="13" width="40" height="38" fill="#6d4a12"/><rect x="13" y="14" width="38" height="36" fill="#5c3e0e"/>
<g clip-path="url(#${u}k)"><rect x="14" y="15" width="36" height="34" fill="url(#${u}s)"/><circle cx="38" cy="33" r="6.500" fill="url(#${u}d)"/>
<path d="M14 33c5-4 9-5 14-2l6 3c5-3 10-3 16 1v14H14z" fill="#5a6a8a" opacity=".85"/><path d="M14 40c7-5 13-4 19 0s12 2 17-2v11H14z" fill="#3f6a52"/><path d="M14 45c8-3 14-2 21 1s11 1 15-1v4H14z" fill="#2a4a3a"/>
<path d="M30 33c4 0 8 .5 10 3" stroke="#ffe9b8" stroke-width=".9" opacity=".6" fill="none"/><rect x="14" y="15" width="36" height="34" fill="#fff" filter="url(#${u}c)" opacity=".5"/></g>
<rect x="13" y="14" width="38" height="36" fill="none" stroke="#2a1b05" stroke-width=".8" opacity=".6"/><path d="M9 10h46M9 10v44" stroke="#fff3b8" stroke-width=".7" opacity=".7"/>`],

  card: ['Playing card', (u) => `<defs>
<radialGradient id="${u}a" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#2f8a52"/><stop offset="1" stop-color="#14442e"/></radialGradient>
<linearGradient id="${u}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffefa"/><stop offset="1" stop-color="#ece4d2"/></linearGradient>
<linearGradient id="${u}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#444"/><stop offset=".5" stop-color="#0d0d0d"/><stop offset="1" stop-color="#000"/></linearGradient>
${noise(u + 'f', '.8', 2, 3, '0 0 0 0 0  0 0 0 0 .1  0 0 0 0 0  0 0 0 .7 -.2')}
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><rect width="64" height="64" fill="#fff" filter="url(#${u}f)" opacity=".35"/>
<g transform="rotate(-10 32 32)"><rect x="17" y="10" width="32" height="46" rx="3.500" fill="#000" opacity=".5" filter="url(#${u}bl)" transform="translate(2 3)"/>
<rect x="16" y="8" width="32" height="46" rx="3.500" fill="url(#${u}p)"/><rect x="16.500" y="8.500" width="31" height="45" rx="3" fill="none" stroke="#c9bfa8" stroke-width=".5"/>
<text x="19" y="18.500" font-family="Georgia,serif" font-weight="700" font-size="9.500" fill="#141414">A</text>
<path d="M21.200 20.500c1.800 2 3.300 3 3.300 4.300 0 1-.9 1.500-1.700 1.300-.4-.1-.7-.3-.9-.6 0 .9.3 1.600.8 2.100h-3c.5-.5.7-1.200.8-2.100-.2.300-.5.500-.9.600-.8.200-1.700-.3-1.700-1.300 0-1.300 1.500-2.300 3.300-4.300z" fill="#141414"/>
<path d="M32 19c6.800 7 11.800 10.200 11.800 15.200 0 3.600-3.300 5.400-6.200 4.600-1.400-.4-2.400-1.200-3-2.200.2 3.300 1.100 5.800 2.900 7.600H26.500c1.800-1.800 2.700-4.300 2.900-7.600-.6 1-1.600 1.800-3 2.200-2.900.8-6.200-1-6.200-4.600 0-5 5-8.200 11.800-15.200z" fill="url(#${u}k)"/><path d="M27 27c2-2 3.500-3.500 5-5" stroke="#fff" stroke-width="1.200" opacity=".25" fill="none" stroke-linecap="round"/></g>`],

  trophy: ['Trophy', (u) => `<defs>
<radialGradient id="${u}a" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#5b3a22"/><stop offset="1" stop-color="#1f130b"/></radialGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5410"/><stop offset=".2" stop-color="#e8b93e"/><stop offset=".38" stop-color="#fff2b8"/><stop offset=".55" stop-color="#d9a22b"/><stop offset=".8" stop-color="#9a6a14"/><stop offset="1" stop-color="#5e3f0a"/></linearGradient>
<linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2a2e"/><stop offset=".4" stop-color="#5c5c66"/><stop offset="1" stop-color="#1a1a1e"/></linearGradient>
<radialGradient id="${u}sp" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><circle cx="32" cy="26" r="26" fill="url(#${u}sp)"/>
<path d="M18 14c-8-1-9 12 2 16M46 14c8-1 9 12-2 16" fill="none" stroke="url(#${u}t)" stroke-width="3" stroke-linecap="round"/>
<path d="M17.500 9h29v8c0 11-6.500 18-14.500 18S17.500 28 17.500 17z" fill="url(#${u}t)" stroke="#6a470a" stroke-width=".7"/>
<ellipse cx="32" cy="9" rx="14.500" ry="2.200" fill="#fff2b8" stroke="#8a5f10" stroke-width=".6"/><ellipse cx="32" cy="9.300" rx="12" ry="1.400" fill="#7a5410" opacity=".55"/>
<path d="M27.800 35h8.400l.9 9H26.900z" fill="url(#${u}t)"/><ellipse cx="32" cy="36" rx="5" ry="1.200" fill="#fff2b8" opacity=".6"/>
<path d="M22 44h20l1.500 3.500h-23z" fill="url(#${u}t)"/><path d="M19 47.500h26V56H19z" fill="url(#${u}m)"/><rect x="25" y="50" width="14" height="3" rx=".6" fill="url(#${u}t)" opacity=".9"/>
<path d="M22 12v15" stroke="#fff" stroke-width="2.200" stroke-linecap="round" opacity=".5"/><path d="M42 14v9" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".35"/>
<path d="M32 15.500l2 4.200 4.500.6-3.300 3.100.8 4.500-4-2.200-4 2.200.8-4.500-3.300-3.100 4.500-.6z" fill="#fff6cf" opacity=".85"/>`],

  crown: ['Crown', (u) => `<defs>
<radialGradient id="${u}a" cx=".5" cy=".4" r=".9"><stop offset="0" stop-color="#7a1f2e"/><stop offset="1" stop-color="#2a0a12"/></radialGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5410"/><stop offset=".22" stop-color="#e8b93e"/><stop offset=".4" stop-color="#fff2b8"/><stop offset=".6" stop-color="#d9a22b"/><stop offset=".85" stop-color="#8a5f10"/><stop offset="1" stop-color="#5e3f0a"/></linearGradient>
<radialGradient id="${u}r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff9a9a"/><stop offset=".5" stop-color="#d4182e"/><stop offset="1" stop-color="#6a0614"/></radialGradient>
<radialGradient id="${u}u" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#bfeaff"/><stop offset=".5" stop-color="#2b8fe0"/><stop offset="1" stop-color="#0d3a7a"/></radialGradient>
<linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a1122a"/><stop offset="1" stop-color="#5a0a18"/></linearGradient>
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><ellipse cx="32" cy="55" rx="22" ry="3.500" fill="#000" opacity=".5" filter="url(#${u}bl)"/>
<path d="M13 46L9 21l12 11 11-18 11 18 12-11-4 25z" fill="url(#${u}t)" stroke="#6a470a" stroke-width=".8" stroke-linejoin="round"/>
<path d="M14 44c10 3 26 3 36 0l-1 5c-10 3-24 3-34 0z" fill="url(#${u}v)"/><path d="M12.500 46h39v6h-39z" fill="url(#${u}t)" stroke="#6a470a" stroke-width=".8"/>
<path d="M12.500 49h39" stroke="#6a470a" stroke-width=".6" opacity=".6"/>
<circle cx="9" cy="19.500" r="3.300" fill="url(#${u}t)"/><circle cx="32" cy="12" r="3.600" fill="url(#${u}t)"/><circle cx="55" cy="19.500" r="3.300" fill="url(#${u}t)"/>
<circle cx="32" cy="38" r="3.600" fill="url(#${u}u)" stroke="#a8730f" stroke-width=".8"/><circle cx="20.500" cy="40.500" r="2.300" fill="url(#${u}r)" stroke="#a8730f" stroke-width=".6"/><circle cx="43.500" cy="40.500" r="2.300" fill="url(#${u}r)" stroke="#a8730f" stroke-width=".6"/>
<path d="M21 31l-5-4" stroke="#fff" stroke-width="1.200" stroke-linecap="round" opacity=".5"/><circle cx="31" cy="37" r=".8" fill="#fff" opacity=".8"/>`],

  dice: ['Dice', (u) => {
    const die = (x, y, rot, pips) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-10" y="-10" width="20" height="20" rx="3.500" fill="#000" opacity=".45" filter="url(#${u}bl)" transform="translate(1.800 2.600)"/><rect x="-10" y="-10" width="20" height="20" rx="3.500" fill="url(#${u}d)"/><rect x="-9.600" y="-9.600" width="19.200" height="19.200" rx="3.200" fill="none" stroke="#fff" stroke-width=".6" opacity=".9"/>${pips.map(([px, py]) => `<circle cx="${px}" cy="${py}" r="1.900" fill="url(#${u}p)"/>`).join('')}</g>`;
    return `<defs><radialGradient id="${u}a" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#2f8a52"/><stop offset="1" stop-color="#103a28"/></radialGradient>
<linearGradient id="${u}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8d2c2"/></linearGradient>
<radialGradient id="${u}p" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#050505"/></radialGradient>
${noise(u + 'f', '.8', 2, 3, '0 0 0 0 0  0 0 0 0 .1  0 0 0 0 0  0 0 0 .7 -.2')}<filter id="${u}bl"><feGaussianBlur stdDeviation="1.2"/></filter></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><rect width="64" height="64" fill="#fff" filter="url(#${u}f)" opacity=".3"/>
${die(24, 38, -14, [[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]])}${die(42, 25, 16, [[-5, -5], [0, 0], [5, 5]])}`;
  }],

  coffee: ['Coffee', (u) => `<defs>
${noise(u + 'w', '.012 .22', 3, 6, '0 0 0 0 .25  0 0 0 0 .13  0 0 0 0 .05  0 0 0 .8 -.2')}
<linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a97b4a"/><stop offset="1" stop-color="#6b4526"/></linearGradient>
<radialGradient id="${u}s" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d9d5cc"/></radialGradient>
<radialGradient id="${u}c" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fbfaf6"/><stop offset=".8" stop-color="#ebe7dc"/><stop offset="1" stop-color="#c9c4b6"/></radialGradient>
<radialGradient id="${u}k" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#9a5f33"/><stop offset=".7" stop-color="#6e3e1e"/><stop offset="1" stop-color="#3f2010"/></radialGradient>
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><rect width="64" height="64" fill="#fff" filter="url(#${u}w)" opacity=".6"/>
<ellipse cx="33" cy="35" rx="25" ry="25" fill="#000" opacity=".4" filter="url(#${u}bl)"/>
<circle cx="31" cy="33" r="24" fill="url(#${u}s)" stroke="#bdb8aa" stroke-width=".6"/><circle cx="31" cy="33" r="19" fill="#d5d1c4" opacity=".6"/>
<path d="M50 28c7-1 8 11 0 11" fill="none" stroke="#e7e3d7" stroke-width="3.500" stroke-linecap="round" transform="translate(-2 0)"/>
<circle cx="31" cy="33" r="17.500" fill="url(#${u}c)" stroke="#c4bfb0" stroke-width=".6"/><circle cx="31" cy="33" r="14.500" fill="url(#${u}k)"/>
<path d="M31 41c-5-3-9-6-9-9.500 0-2.800 2.400-4.200 4.600-4.200 1.800 0 3.600 1 4.400 2.600.8-1.600 2.600-2.600 4.400-2.600 2.200 0 4.600 1.400 4.600 4.200 0 3.500-4 6.500-9 9.500z" fill="#f4e6d0"/>
<path d="M31 38.500c-3-1.800-5.500-3.600-5.500-5.600 0-1.600 1.400-2.500 2.700-2.500 1.200 0 2.300.6 2.800 1.600.5-1 1.600-1.600 2.800-1.600 1.300 0 2.700.9 2.700 2.500 0 2-2.500 3.800-5.500 5.600z" fill="#b57a4a" opacity=".7"/>
<ellipse cx="25" cy="26" rx="6" ry="2.500" fill="#fff" opacity=".28" transform="rotate(-35 25 26)"/>`],

  sunflower: ['Sunflower', (u) => `<defs>
<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7db8e6"/><stop offset="1" stop-color="#cfe7f4"/></linearGradient>
<radialGradient id="${u}c" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6b4a1e"/><stop offset=".55" stop-color="#3a220c"/><stop offset="1" stop-color="#241408"/></radialGradient>
<linearGradient id="${u}p" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e08a00"/><stop offset=".6" stop-color="#ffbe10"/><stop offset="1" stop-color="#ffd84a"/></linearGradient>
<linearGradient id="${u}p2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c97800"/><stop offset="1" stop-color="#f4a900"/></linearGradient>
<filter id="${u}bl"><feGaussianBlur stdDeviation="2.200"/></filter></defs>
<rect width="64" height="64" fill="url(#${u}a)"/><ellipse cx="14" cy="50" rx="20" ry="9" fill="#9fcf7a" opacity=".6" filter="url(#${u}bl)"/><ellipse cx="54" cy="56" rx="20" ry="8" fill="#6fae52" opacity=".6" filter="url(#${u}bl)"/>
<path d="M32 40c0 10-1 17-1 24" stroke="#3f7a2c" stroke-width="3.600" fill="none"/><path d="M31.500 55c-9-1-12-7-12-10 7 0 12 4 12 10z" fill="#4f9238"/><path d="M31.500 55c-5-2-8-5-9.500-8.500" stroke="#2f6020" stroke-width=".6" fill="none"/>
<g transform="translate(32 27)">${Array.from({ length: 16 }, (_, i) => `<path d="M0 -7.500c-4 -2 -4.800 -10 0 -17c4.800 7 4 15 0 17z" fill="url(#${u}p2)" transform="rotate(${i * 22.5 + 11})"/>`).join('')}${Array.from({ length: 16 }, (_, i) => `<path d="M0 -7.500c-4 -2 -4.800 -10 0 -17c4.800 7 4 15 0 17z" fill="url(#${u}p)" transform="rotate(${i * 22.5})"/><path d="M0 -9v-12" stroke="#c97800" stroke-width=".3" opacity=".6" transform="rotate(${i * 22.5})"/>`).join('')}</g>
<circle cx="32" cy="27" r="9.500" fill="url(#${u}c)"/><g fill="#a9743a" opacity=".55">${Array.from({ length: 40 }, (_, i) => { const a = i * 2.4, r = 1 + 8 * Math.sqrt(i / 40); return `<circle cx="${(32 + r * Math.cos(a)).toFixed(2)}" cy="${(27 + r * Math.sin(a)).toFixed(2)}" r=".5"/>`; }).join('')}</g><circle cx="32" cy="27" r="9.500" fill="none" stroke="#c9922f" stroke-width=".8" opacity=".6"/>`],
};
Object.assign(OBJECTS, REAL);
delete OBJECTS.rocket; delete OBJECTS.cat;

export const OBJECT_LIST = Object.entries(OBJECTS).map(([id, [name]]) => ({ id, name }));

function objectSVG(id) {
  const o = OBJECTS[id] || OBJECTS.moon;
  const u = 'o' + (uidN++);
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${o[1](u)}</svg>`;
}

export function avatarSVG(a = PLAYER_AVATARS[0]) {
  if (a.initials) {
    const txt = String(a.initials).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
    const bg = /^#[0-9a-fA-F]{3,8}$/.test(a.bg || '') ? a.bg : '#fadbd8';
    const fg = /^#[0-9a-fA-F]{3,8}$/.test(a.fg || '') ? a.fg : '#a93226';
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${bg}"/><text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="25" fill="${fg}">${txt}</text></svg>`;
  }
  if (a.photo) return `<img src="img/faces/${a.photo}.webp" alt="" draggable="false">`;
  if (a.img && /^data:image\//.test(a.img)) return `<img src="${a.img}" alt="" draggable="false">`;
  if (a.obj) return objectSVG(a.obj);
  return faceSVG(a);
}

// The player's avatar: d.avatar is a face index, an object id ("moon"), or "photo" (d.photo is a small data URL).
export function playerAvatar(d) {
  const v = d.avatar;
  if (v === 'photo' && d.photo) return { img: d.photo };
  if (typeof v === 'string' && OBJECTS[v]) return { obj: v };
  return PLAYER_AVATARS[v] || PLAYER_AVATARS[0];
}

export function avatarEl(spec, size = 44, cls = '') {
  const el = document.createElement('div');
  el.className = 'avatar ' + cls;
  el.style.width = el.style.height = size + 'px';
  el.innerHTML = avatarSVG(spec);
  return el;
}
export const avatarHTML = (spec, size = 44, cls = '') =>
  `<div class="avatar ${cls}" style="width:${size}px;height:${size}px">${avatarSVG(spec)}</div>`;
