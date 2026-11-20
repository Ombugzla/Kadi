// Small inline SVG icon set (24x24, filled or stroked with currentColor).
const S = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
const fill = (d) => S(`<path fill="currentColor" d="${d}"/>`);
const line = (d, w = 2) => S(`<path fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`);

export const ICON = {
  home: fill('M12 3 3 10.5V21h6.2v-6h5.6v6H21V10.5z'),
  ladder: fill('M4 20h4V11H4zm6 0h4V4h-4zm6 0h4v-6h-4z'),
  learn: S('<path fill="currentColor" d="M12 4 1.5 9 12 14l8.5-4.05V15H22V9z"/><path fill="currentColor" d="M5.5 12.6v3.4c0 1.4 2.9 3 6.5 3s6.5-1.6 6.5-3v-3.4L12 15.7z"/>'),
  more: fill('M4 6h16v2.4H4zm0 4.8h16v2.4H4zm0 4.8h16V18H4z'),
  flame: S('<path fill="currentColor" d="M12.6 2.2c.5 3.3-1.1 4.9-2.7 6.7C8.3 10.700 7 12.100 7 14.500 7 18 9.600 21 13 21s6-2.600 6-6c0-2.500-1.200-4.300-2.600-5.700-.3 1.200-.9 2-1.700 2.400.4-3.200-.5-6.700-2.100-9.500z"/>'),
  gear: S('<path fill="currentColor" d="M19.4 13a7.600 7.600 0 0 0 0-2l2-1.600a.5.500 0 0 0 .1-.600l-1.900-3.300a.5.500 0 0 0-.600-.2l-2.400 1a7 7 0 0 0-1.700-1l-.4-2.500a.5.500 0 0 0-.5-.4h-3.800a.5.500 0 0 0-.5.400l-.4 2.500a7 7 0 0 0-1.700 1l-2.400-1a.5.500 0 0 0-.6.200L2.500 8.800a.5.500 0 0 0 .1.600l2 1.600a7.600 7.600 0 0 0 0 2l-2 1.600a.5.500 0 0 0-.1.600l1.900 3.300c.1.200.4.300.6.200l2.400-1c.5.400 1.100.7 1.700 1l.4 2.500c0 .2.200.4.500.4h3.800c.3 0 .5-.2.500-.4l.4-2.500c.6-.3 1.200-.6 1.700-1l2.400 1c.2.100.5 0 .6-.2l1.900-3.300a.5.500 0 0 0-.1-.600zM12 15.500a3.500 3.500 0 1 1 0-7 3.500 3.500 0 0 1 0 7z"/>'),
  close: line('M6 6l12 12M18 6 6 18', 2.4),
  back: line('M15 5l-7 7 7 7', 2.6),
  chevron: line('M9 5l7 7-7 7', 2.4),
  check: line('M5 12.500l4.500 4.500L19 7.500', 2.8),
  list: S('<g fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><circle cx="5" cy="6" r="1.300"/><circle cx="5" cy="12" r="1.300"/><circle cx="5" cy="18" r="1.300"/><path d="M10 6h10M10 12h10M10 18h10"/></g>'),
  sound: S('<path fill="currentColor" d="M3 9.500v5h3.500L11 18.500v-13L6.500 9.500z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M14.500 9a4 4 0 0 1 0 6M17 6.500a7.500 7.500 0 0 1 0 11"/>'),
  mute: S('<path fill="currentColor" d="M3 9.500v5h3.500L11 18.500v-13L6.500 9.500z"/><path fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" d="M15 9.500l5 5m0-5-5 5"/>'),
  spade: fill('M12 2C9 6.500 4 9.500 4 14a4.300 4.300 0 0 0 7 3.300c-.1 1.600-.7 3-2 4.200h6c-1.300-1.200-1.900-2.600-2-4.200A4.300 4.300 0 0 0 20 14c0-4.500-5-7.500-8-12z'),
  heart: fill('M12 21C4 14.500 2.500 11.500 2.500 8.500A4.800 4.800 0 0 1 12 6.700a4.800 4.800 0 0 1 9.500 1.800c0 3-1.500 6-9.500 12.500z'),
  seq: S('<g fill="currentColor"><rect x="2" y="7" width="6.500" height="10" rx="1.200" opacity=".55" transform="rotate(-12 5 12)"/><rect x="8.700" y="5.500" width="6.500" height="11" rx="1.200" opacity=".8"/><rect x="15.500" y="7" width="6.500" height="10" rx="1.200" transform="rotate(12 19 12)"/></g>'),
  trophy: fill('M7 3h10v3h3v2.500a4 4 0 0 1-3.700 4A5 5 0 0 1 13 15.600V18h3v3H8v-3h3v-2.400a5 5 0 0 1-3.300-3.100A4 4 0 0 1 4 8.500V6h3zm-1.500 5v.500c0 .8.500 1.500 1.200 1.800A9 9 0 0 1 6.500 8zm13 0h-1.200c0 1.200-.1 2.100-.3 2.300.800-.3 1.500-1 1.500-1.800z'),
  star: fill('M12 2.500l2.900 6.100 6.600.9-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.9z'),
  play: fill('M7 4.500v15l13-7.500z'),
  info: S('<circle cx="12" cy="12" r="9.500" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/><circle cx="12" cy="7.600" r="1.300" fill="currentColor"/>'),
  swap: line('M4 8h14l-3.500-3.500M20 16H6l3.500 3.500', 2.200),
  take: S('<g fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="15" rx="2"/><path d="M12 8v7m-3-3 3 3 3-3"/></g>'),
  reverse: line('M4 9h12l-3-3M20 15H8l3 3', 2.200),
  clock: S('<circle cx="12" cy="12.500" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v5l3 2M9.500 2.500h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  bell: fill('M12 22a2.400 2.400 0 0 0 2.400-2.400H9.600A2.400 2.400 0 0 0 12 22zm7-6.400V11a7 7 0 0 0-5.200-6.800V3.500a1.800 1.800 0 0 0-3.600 0v.700A7 7 0 0 0 5 11v4.600l-2 2V19h18v-1.400z'),
  mail: S('<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="5.500" width="18" height="13" rx="2"/><path d="M3.500 7.200 12 13.500l8.500-6.300"/></g>'),
  user: S('<circle cx="12" cy="8" r="4" fill="currentColor"/><path fill="currentColor" d="M4 20.500c0-4 3.600-6.500 8-6.500s8 2.500 8 6.500z"/>'),
  palette: fill('M12 3a9 9 0 1 0 0 18c1.500 0 2-1 1.600-2-.5-1.100.2-2.400 1.600-2.400H17a4 4 0 0 0 4-4C21 6.700 17 3 12 3zM7.500 12a1.300 1.300 0 1 1 0-2.600 1.300 1.300 0 0 1 0 2.600zm3-4a1.300 1.300 0 1 1 0-2.600 1.300 1.300 0 0 1 0 2.600zm5 0a1.300 1.300 0 1 1 0-2.600 1.300 1.300 0 0 1 0 2.600z'),
  shield: S('<path fill="currentColor" d="M12 2.500 4 5.500v6c0 4.800 3.300 8.600 8 10 4.700-1.400 8-5.200 8-10v-6z"/><path d="M8.500 12l2.500 2.500 4.500-5" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/>'),
  doc: S('<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6.500 3h7l4.500 4.500V20a1 1 0 0 1-1 1H6.500a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M13.500 3v4.500H18M8.500 12.500h7M8.500 16h7"/></g>'),
  moon: fill('M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z'),
  rematch: S('<rect x="3" y="5" width="11" height="15" rx="2" fill="currentColor" opacity=".45" transform="rotate(-14 8.500 12.500)"/><rect x="9" y="4" width="11" height="15" rx="2" fill="currentColor" transform="rotate(9 14.500 11.500)"/><path d="M14.800 7.800c-1.500 2-3.300 3-3.300 4.700a1.600 1.600 0 0 0 2.600 1.200c0 .6-.3 1.100-.8 1.500h3c-.5-.4-.8-.9-.8-1.500a1.600 1.600 0 0 0 2.600-1.200c0-1.700-1.800-2.700-3.300-4.700z" fill="var(--accent-d)"/>'),
  heartfill: fill('M12 21C4 14.500 2.500 11.500 2.500 8.500A4.800 4.800 0 0 1 12 6.700a4.800 4.800 0 0 1 9.500 1.800c0 3-1.500 6-9.500 12.500z'),
  lock: fill('M7 10V8a5 5 0 0 1 10 0v2h1.500v11h-13V10zm2.200 0h5.600V8a2.800 2.800 0 0 0-5.600 0z'),
};

export const icon = (name, cls = '') => `<span class="ic ${cls}">${ICON[name] || ''}</span>`;
