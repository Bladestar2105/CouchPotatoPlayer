// Line icons
const R = React.createElement;
const path = (d, key) => R('path', { d, key });
const circle = (attrs, key) => R('circle', { ...attrs, key });
const rect = (attrs, key) => R('rect', { ...attrs, key });
const ellipse = (attrs, key) => R('ellipse', { ...attrs, key });
const text = (attrs, children, key) => R('text', { ...attrs, key }, children);

const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', style }) =>
  R('svg', { width: size, height: size, viewBox: '0 0 24 24', fill, stroke, strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', style },
    typeof d === 'string' ? R('path', { d }) : d
  );

const ICONS = {
  play: 'M6 4l14 8-14 8V4z',
  pause: [rect({ x: 6, y: 4, width: 4, height: 16, rx: 1 }, 'a'), rect({ x: 14, y: 4, width: 4, height: 16, rx: 1 }, 'b')],
  home: 'M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z',
  tv: [rect({ x: 3, y: 5, width: 18, height: 13, rx: 2 }, 'a'), path('M8 21h8M12 18v3', 'b')],
  movie: [rect({ x: 3, y: 5, width: 18, height: 14, rx: 2 }, 'a'), path('M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4', 'b')],
  series: [rect({ x: 3, y: 7, width: 18, height: 13, rx: 2 }, 'a'), path('M8 3l4 4 4-4', 'b')],
  star: 'M12 3l2.9 6 6.6.9-4.8 4.7 1.2 6.6-6-3.2-6 3.2 1.2-6.6-4.8-4.7 6.6-.9 2.9-6z',
  clock: [circle({ cx: 12, cy: 12, r: 9 }, 'a'), path('M12 7v5l3 2', 'b')],
  search: [circle({ cx: 11, cy: 11, r: 7 }, 'a'), path('M20 20l-3.5-3.5', 'b')],
  settings: [circle({ cx: 12, cy: 12, r: 3 }, 'a'), path('M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z', 'b')],
  heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 7',
  chevronR: 'M9 6l6 6-6 6',
  chevronL: 'M15 6l-9 6 9 6',
  chevronD: 'M6 9l6 6 6-6',
  arrowR: 'M5 12h14M13 5l7 7-7 7',
  arrowL: 'M19 12H5M11 5l-7 7 7 7',
  back: 'M10 19l-7-7 7-7M3 12h18',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6l-12 12',
  volume: [path('M11 5L6 9H2v6h4l5 4V5z', 'a'), path('M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13', 'b')],
  mute: [path('M11 5L6 9H2v6h4l5 4V5z', 'a'), path('M22 9l-6 6M16 9l6 6', 'b')],
  cc: [rect({ x: 3, y: 5, width: 18, height: 14, rx: 2 }, 'a'), path('M8 11c-.7-.6-1.5-.9-2.3-.5S4.5 12 5 13s1.8 1 2.5.5M16 11c-.7-.6-1.5-.9-2.3-.5s-1.2 1.5-.7 2.5 1.8 1 2.5.5', 'b')],
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  skip15: [path('M4 12a8 8 0 018-8c2.2 0 4.2 1 5.6 2.4L20 4v5h-5', 'a'), text({ x: 7, y: 17, fontSize: 7, fontWeight: 700, fill: 'currentColor', stroke: 'none', fontFamily: 'Inter' }, '15', 'b')],
  skip15r: [path('M20 12a8 8 0 00-8-8c-2.2 0-4.2 1-5.6 2.4L4 4v5h5', 'a'), text({ x: 7, y: 17, fontSize: 7, fontWeight: 700, fill: 'currentColor', stroke: 'none', fontFamily: 'Inter' }, '15', 'b')],
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  share: [circle({ cx: 18, cy: 5, r: 3 }, 'a'), circle({ cx: 6, cy: 12, r: 3 }, 'b'), circle({ cx: 18, cy: 19, r: 3 }, 'c'), path('M8.6 13.5l6.8 4M15.4 6.5l-6.8 4', 'd')],
  info: [circle({ cx: 12, cy: 12, r: 9 }, 'a'), path('M12 16v-4M12 8h.01', 'b')],
  bookmark: 'M6 4h12v17l-6-4-6 4V4z',
  history: [path('M3 12a9 9 0 109-9 9 9 0 00-7 3.5M3 4v4h4', 'a'), path('M12 7v5l3 2', 'b')],
  filter: 'M3 5h18l-7 9v6l-4-2v-4z',
  grid: [rect({ x: 3, y: 3, width: 7, height: 7, rx: 1 }, 'a'), rect({ x: 14, y: 3, width: 7, height: 7, rx: 1 }, 'b'), rect({ x: 3, y: 14, width: 7, height: 7, rx: 1 }, 'c'), rect({ x: 14, y: 14, width: 7, height: 7, rx: 1 }, 'd')],
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  signal: 'M2 20h3V10H2zm5 0h3V4H7zm5 0h3V14h-3zm5 0h3V8h-3z',
  globe: [circle({ cx: 12, cy: 12, r: 9 }, 'a'), path('M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18', 'b')],
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  wifi: [path('M2 9a15 15 0 0120 0M5 13a10 10 0 0114 0M8.5 16.5a5 5 0 017 0', 'a'), circle({ cx: 12, cy: 20, r: 1, fill: 'currentColor' }, 'b')],
  user: [circle({ cx: 12, cy: 8, r: 4 }, 'a'), path('M4 20c1-4 5-6 8-6s7 2 8 6', 'b')],
  sparkle: 'M12 3l1.8 5.2 5.2 1.8-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  dot: circle({ cx: 12, cy: 12, r: 2, fill: 'currentColor' }, 'a'),
  cast: [path('M3 8V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-6', 'a'), path('M3 12a8 8 0 018 8M3 16a4 4 0 014 4M3 20h.01', 'b')],
  music: [circle({ cx: 6, cy: 18, r: 3 }, 'a'), circle({ cx: 18, cy: 16, r: 3 }, 'b'), path('M9 18V5l12-2v13', 'c')],
  globe2: [circle({ cx: 12, cy: 12, r: 9 }, 'a'), path('M3 12h18', 'b'), ellipse({ cx: 12, cy: 12, rx: 4, ry: 9 }, 'c')],
  refresh: 'M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5',
};

const I = ({ name, size, stroke, style }) => R(Icon, { d: ICONS[name], size, stroke, style });

window.I = I;
window.ICONS = ICONS;
