// Shared mock data for CouchPotatoPlayer designs

const CHANNELS = [
  { num: 101, name: 'ARD Das Erste HD',    logo: '1',  bg: '#003b7a', now: 'Tagesschau',              next: 'Tatort: Nachtschatten', cat: 'News', country: 'DE' },
  { num: 102, name: 'ZDF HD',               logo: 'Z',  bg: '#e68a00', now: 'heute journal',            next: 'Markus Lanz',           cat: 'News', country: 'DE' },
  { num: 103, name: 'ProSieben HD',         logo: 'P7', bg: '#e22124', now: 'Galileo',                  next: 'TV total',              cat: 'Entertainment', country: 'DE' },
  { num: 104, name: 'RTL HD',               logo: 'R',  bg: '#00bfef', now: 'GZSZ',                     next: 'Bauer sucht Frau',      cat: 'Entertainment', country: 'DE' },
  { num: 105, name: 'Sky Cinema Premieren', logo: 'S',  bg: '#0a2a5a', now: 'Dune: Part Two',           next: 'The Batman',            cat: 'Movies', country: 'DE' },
  { num: 106, name: 'Sky Sport Bundesliga', logo: 'SB', bg: '#d40000', now: 'Bayern vs. BVB',           next: 'Sport1 News',           cat: 'Sports', country: 'DE' },
  { num: 107, name: 'DAZN 1 HD',            logo: 'DZ', bg: '#1f1f26', now: 'Champions League Pre-Show',next: 'Real Madrid vs. Arsenal',cat: 'Sports', country: 'DE' },
  { num: 108, name: 'Arte HD',              logo: 'Ar', bg: '#2b2b2b', now: 'Re: Europa am Scheideweg', next: 'Arte Journal',          cat: 'Docu', country: 'DE' },
  { num: 109, name: 'National Geographic',  logo: 'NG', bg: '#ffcc00', now: 'Mars: Inside SpaceX',      next: 'Cosmos',                cat: 'Docu', country: 'US' },
  { num: 110, name: 'Nick Jr.',             logo: 'NJ', bg: '#ff7a00', now: 'Paw Patrol',               next: 'Bluey',                 cat: 'Kids', country: 'US' },
  { num: 111, name: 'MTV Live HD',          logo: 'MT', bg: '#1a1a1a', now: 'Top 40 Chart Show',        next: 'Unplugged Live',        cat: 'Music', country: 'US' },
  { num: 112, name: 'CNN International',    logo: 'CN', bg: '#b40000', now: 'Amanpour',                 next: 'Quest Means Business',  cat: 'News', country: 'US' },
  { num: 113, name: 'BBC One HD',           logo: 'BB', bg: '#cc0000', now: 'BBC News at Ten',          next: 'Question Time',         cat: 'News', country: 'UK' },
  { num: 114, name: 'Eurosport 1 HD',       logo: 'E1', bg: '#1b7f3a', now: 'Ski Alpin Weltcup',        next: 'Tennis: ATP Masters',   cat: 'Sports', country: 'EU' },
  { num: 115, name: 'Discovery Channel',    logo: 'DC', bg: '#004c8c', now: 'Gold Rush: Alaska',        next: 'Deadliest Catch',       cat: 'Docu', country: 'US' },
];

const MOVIES = [
  { t: 'Echoes of Orion',        y: 2024, d: '2h 18m', r: 8.4, g: 'scifi',    genre: 'Sci‑Fi',   desc: 'A deep‑space archaeologist unravels a signal older than time.' },
  { t: 'The Last Bureau',        y: 2023, d: '1h 54m', r: 7.8, g: 'thriller', genre: 'Thriller', desc: 'A rogue agent between three governments, two lies, one truth.' },
  { t: 'Ironwood',               y: 2024, d: '2h 06m', r: 8.0, g: 'drama',    genre: 'Drama',    desc: 'A father, a forest, and a debt four generations old.' },
  { t: 'Neon Requiem',           y: 2024, d: '1h 49m', r: 7.3, g: 'action',   genre: 'Action',   desc: 'Night‑drenched neon, silent protagonist, loud consequences.' },
  { t: 'Silhouette',             y: 2024, d: '2h 01m', r: 8.1, g: 'mystery',  genre: 'Mystery',  desc: 'Something is missing from every photograph she takes.' },
  { t: 'Salt & Smoke',           y: 2023, d: '1h 36m', r: 7.6, g: 'romance',  genre: 'Romance',  desc: 'A fishing town, a ten‑year promise, one last summer.' },
  { t: 'Grid Zero',              y: 2024, d: '2h 22m', r: 8.2, g: 'scifi',    genre: 'Sci‑Fi',   desc: 'The city forgets everyone on the ninth day of September.' },
  { t: 'Paperbirds',             y: 2023, d: '1h 44m', r: 7.9, g: 'indie',    genre: 'Indie',    desc: 'Two strangers learn to disappear in the same city.' },
  { t: 'Varroa',                 y: 2024, d: '1h 58m', r: 7.1, g: 'horror',   genre: 'Horror',   desc: 'Every beekeeper in the village has gone quiet.' },
  { t: 'Everlast Hotel',         y: 2024, d: '1h 41m', r: 8.6, g: 'comedy',   genre: 'Comedy',   desc: 'Staff of four, guests of none, and a winter that won\u2019t end.' },
  { t: 'Hummingbird Engine',     y: 2023, d: '2h 08m', r: 8.3, g: 'action',   genre: 'Action',   desc: 'She built the fastest car ever raced. Then it was stolen.' },
  { t: 'Low Tide',               y: 2024, d: '1h 32m', r: 7.4, g: 'drama',    genre: 'Drama',    desc: 'The coastline changes faster than her mother\u2019s memory.' },
];

const SERIES = [
  { t: 'Cold Harbor',     y: 2024, s: 2, e: 16, r: 8.7, g: 'thriller', genre: 'Thriller' },
  { t: 'The Orchardist',  y: 2024, s: 1, e: 8,  r: 8.3, g: 'drama',    genre: 'Drama' },
  { t: 'Mass: Vector',    y: 2023, s: 3, e: 28, r: 9.0, g: 'scifi',    genre: 'Sci‑Fi' },
  { t: 'Salonnière',      y: 2024, s: 1, e: 10, r: 8.1, g: 'drama',    genre: 'Period' },
  { t: 'Below the Fold',  y: 2024, s: 2, e: 18, r: 8.5, g: 'mystery',  genre: 'Mystery' },
  { t: 'Relay',           y: 2024, s: 1, e: 6,  r: 7.9, g: 'docu',     genre: 'Docuseries' },
  { t: 'Apex & Anchor',   y: 2023, s: 4, e: 40, r: 8.8, g: 'action',   genre: 'Action' },
  { t: 'Heartwood',       y: 2024, s: 1, e: 8,  r: 8.0, g: 'romance',  genre: 'Romance' },
];

const CONTINUE = [
  { t: 'Cold Harbor',         ep: 'S2·E14 — The Freezer',    p: 0.62, left: '28 min left',  g: 'thriller' },
  { t: 'Echoes of Orion',     ep: 'Movie',                    p: 0.34, left: '1h 22m left', g: 'scifi' },
  { t: 'The Orchardist',      ep: 'S1·E3 — The Shearing',     p: 0.12, left: '46 min left', g: 'drama' },
  { t: 'Mass: Vector',        ep: 'S3·E9 — Light Year',       p: 0.78, left: '11 min left', g: 'scifi' },
  { t: 'Hummingbird Engine',  ep: 'Movie',                    p: 0.48, left: '1h 05m left', g: 'action' },
];

const CATEGORIES = ['All', 'Drama', 'Sci‑Fi', 'Thriller', 'Comedy', 'Action', 'Documentary', 'Kids', 'Sports'];

const EPG_TIMES = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30'];

// Programme timeline per channel (start hour, duration in 30-min slots, title)
const EPG_PROGRAMS = {
  101: [[18, 2, 'Brisant'], [19, 1, 'Sportschau'], [19.5, 1, 'Tagesschau'], [20, 3, 'Tatort: Nachtschatten'], [21.5, 2, 'Die Story im Ersten']],
  102: [[18, 2, 'hallo deutschland'], [19, 1, 'heute'], [19.5, 1, 'Wetter'], [20, 2, 'Der Alte'], [21, 3, 'Markus Lanz']],
  103: [[18, 3, 'Galileo Spezial'], [19.5, 1, 'Newstime'], [20, 4, 'TV total Wok-WM'], [22, 2, 'Late Night Berlin']],
  104: [[18, 2, 'Explosiv'], [19, 2, 'GZSZ'], [20, 3, 'Alles was zählt'], [21.5, 3, 'Bauer sucht Frau']],
  105: [[18, 4, 'Dune: Part Two'], [20, 5, 'The Batman']],
  106: [[18, 1, 'Warm-up'], [18.5, 4, 'Bayern vs. Dortmund'], [20.5, 2, 'Analyse'], [21.5, 2, 'Sport1 News']],
  107: [[18, 2, 'CL Pre-Show'], [19, 5, 'Real Madrid vs. Arsenal'], [21.5, 2, 'Post-Match']],
  108: [[18, 2, 'Re: Europa'], [19, 3, 'Mit offenen Karten'], [20.5, 2, 'Arte Journal'], [21.5, 2, 'Tracks East']],
};

// Mini-detail data for the "now playing" hero
const HERO = {
  t: 'Cold Harbor',
  tagline: 'A new season. A colder secret.',
  desc: 'Detective Aline Vance returns to her hometown to investigate a case her father closed thirty years ago — only to find the village has been waiting for her.',
  y: 2024, s: 'Season 2', ep: '16 episodes', r: 8.7, mpa: 'TV‑MA',
  g: 'thriller', genre: 'Thriller · Mystery',
};

window.DATA = { CHANNELS, MOVIES, SERIES, CONTINUE, CATEGORIES, EPG_TIMES, EPG_PROGRAMS, HERO };
