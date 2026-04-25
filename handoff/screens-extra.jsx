// Extra screens — Series detail, Web player, Player live, Player VOD web, Welcome, variations

// ============ SERIES DETAIL — TV ============
function SeriesDetailTV() {
  const { HERO } = window.DATA;
  const eps = [
    ['The Shearing',       '46:12', 'Aline returns to Cold Harbor and reopens her father\u2019s file.'],
    ['Ice Widow',          '52:04', 'A body turns up where no body should be.'],
    ['Father\u2019s Case', '48:30', 'The village chooses sides.'],
    ['Ten Winters',        '51:18', 'A name surfaces after three decades.'],
    ['The Freezer',        '49:42', 'Aline goes into the place nobody returns from.'],
    ['Tide Marks',         '53:06', 'The coast reveals what the village tried to bury.'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 460, position: 'relative' }}>
        <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, var(--bg) 8%, rgba(7,7,10,0.2) 60%, rgba(7,7,10,0.5) 100%), linear-gradient(90deg, rgba(7,7,10,0.85) 0%, transparent 55%)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 26, left: 36, right: 36, display: 'flex', zIndex: 5 }}>
          <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.45)' }}><I name="back" size={16}/> Back</button>
        </div>
        <div style={{ position: 'absolute', left: 52, bottom: 40, zIndex: 3, maxWidth: 560 }}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>Exclusive on CouchPotato</div>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, marginTop: 10 }}>{HERO.t}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>
            <span>★ {HERO.r}</span><span>·</span><span>2 Seasons · 16 Episodes</span><span>·</span><span>{HERO.genre}</span>
            <span style={{ padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 10 }}>{HERO.mpa}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary tv-focus" style={{ padding: '12px 22px', fontSize: 14 }}><I name="play" size={16}/> Resume S2 · E5</button>
            <button className="btn btn-ghost"><I name="plus" size={14}/> My List</button>
            <button className="btn btn-ghost"><I name="download" size={14}/> Download</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 52px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 700 }}>{HERO.desc}</div>
            <div style={{ display: 'flex', gap: 32, marginTop: 18, fontSize: 11 }}>
              <div>
                <div className="eyebrow">Created by</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Vera Larsen</div>
              </div>
              <div>
                <div className="eyebrow">Starring</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Ingrid Holm, Kai Fischer, Tomas Aune</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Season 1','Season 2'].map((s, i) => (
              <span key={s} className={i === 1 ? 'pill tv-focus' : 'pill'} style={i === 1 ? { background: 'var(--accent)', color: '#fff' } : {}}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {eps.map(([t, d, desc], i) => (
            <div key={i} className={i === 0 ? 'tv-focus' : ''} style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 12 }}>
              <div style={{ width: 120, aspectRatio: '16/10', borderRadius: 7, background: `linear-gradient(135deg, ${['#1a0b1f','#0a1a3a','#3a1a0f','#0d0d14','#0a2a3a','#1a2a2a'][i]}, #07070a)`, flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,0.8)', padding: '2px 5px', borderRadius: 3 }} className="mono">{d}</div>
                {i === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.2)' }}><div style={{ width: '38%', height: '100%', background: 'var(--accent)' }} /></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }} className="mono">S2 · E{i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ WELCOME (first-run) ============
function WelcomeScreen() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 30% 20%, #1a0f14 0%, var(--bg) 55%)', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
      {/* Decorative poster wall */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, padding: 20, height: '100%', transform: 'rotate(-8deg) scale(1.4)', transformOrigin: 'center' }}>
          {Array.from({ length: 32 }).map((_, i) => {
            const g = ['thriller','scifi','drama','action','mystery','romance','horror','comedy'][i % 8];
            return <div key={i} className={`poster g-${g}`} style={{ aspectRatio: '2/3', borderRadius: 8 }} />;
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, var(--bg) 10%, rgba(7,7,10,0.8) 60%, rgba(7,7,10,0.4) 100%)', zIndex: 2 }} />

      <div style={{ position: 'relative', zIndex: 3, maxWidth: 560 }}>
        <div style={{ width: 200, height: 200, margin: '0 auto 22px', borderRadius: 28, overflow: 'hidden', background: '#22416B', boxShadow: '0 30px 80px -20px rgba(232,93,28,0.45), inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <img src="assets/character_logo.png" alt="CouchPotatoPlayer"
               style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Your couch.<br/>Your library.</div>
        <div style={{ fontSize: 16, color: 'var(--text-dim)', marginTop: 18, lineHeight: 1.55 }}>
          Bring your Xtream Codes or M3U provider. CouchPotato gives it a cinema‑grade player, a real TV guide, and the same library across iPhone, iPad, Apple&nbsp;TV and Android.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
          <button className="btn btn-primary" style={{ padding: '14px 24px', fontSize: 14 }}>Get Started <I name="arrowR" size={14}/></button>
          <button className="btn btn-ghost" style={{ padding: '14px 20px', fontSize: 14 }}>I already have a profile</button>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 34, fontSize: 11, color: 'var(--text-muted)' }}>
          <span className="pill">iOS</span><span className="pill">iPadOS</span><span className="pill">tvOS</span><span className="pill">Android</span><span className="pill">Android TV</span><span className="pill">Web</span>
        </div>
      </div>
    </div>
  );
}

// ============ PLAYER LIVE — TV ============
function PlayerLiveTV() {
  const { CHANNELS } = window.DATA;
  const ch = CHANNELS[6]; // DAZN
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden', color: '#fff' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #0f4a2a 0%, #02140a 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 60%, rgba(255,255,255,0.06), transparent 40%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.04), transparent 50%)' }} />
      {/* Score chip */}
      <div style={{ position: 'absolute', top: 26, left: 32, display: 'flex', gap: 10, alignItems: 'center', zIndex: 5 }}>
        <span className="pill live">LIVE</span>
        <span className="pill"><I name="signal" size={10}/> UHD · HDR10</span>
      </div>

      {/* Channel chip */}
      <div style={{ position: 'absolute', top: 26, right: 32, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.5)', padding: '8px 14px', borderRadius: 99, zIndex: 5 }}>
        <Logo letter={ch.logo} bg={ch.bg} size={26} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{ch.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{ch.now}</div>
        </div>
      </div>

      {/* Channel mini-list (TV overlay) */}
      <div style={{ position: 'absolute', left: 32, top: 110, bottom: 200, width: 320, background: 'rgba(7,7,10,0.7)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, zIndex: 5 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Also live</div>
        {CHANNELS.slice(3, 9).map((c, i) => (
          <div key={c.num} className={i === 3 ? 'tv-focus' : ''} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            background: i === 3 ? 'rgba(255,94,58,0.15)' : 'transparent',
            marginBottom: 2,
          }}>
            <Logo letter={c.logo} bg={c.bg} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.now}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '26px 32px', zIndex: 5, background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>On air 20:00 – 22:30 · 67% complete</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>Real Madrid vs. Arsenal</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>UEFA Champions League · Quarterfinal · Leg 2</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="cc" size={14}/></button>
            <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="volume" size={14}/></button>
            <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="fullscreen" size={14}/></button>
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.18)', borderRadius: 2, marginTop: 14, position: 'relative' }}>
          <div style={{ width: '67%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

// ============ PLAYER — Mobile VOD ============
function PlayerMobile() {
  const { HERO } = window.DATA;
  return (
    <MobileFrame width={820} height={380}>
      <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden', color: '#fff' }}>
        <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%', filter: 'brightness(0.5)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />
        <div style={{ position: 'absolute', top: 16, left: 20, right: 20, display: 'flex', alignItems: 'center', zIndex: 3, gap: 12 }}>
          <I name="back" size={22} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.08em' }}>S2 · E15</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Cold Harbor — The Shearing</div>
          </div>
          <I name="cast" size={20} />
          <I name="settings" size={20} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, zIndex: 3 }}>
          <I name="skip15r" size={34} />
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center' }}>
            <I name="play" size={30} />
          </div>
          <I name="skip15" size={34} />
        </div>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, zIndex: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            <span>28:14</span>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' }}>
              <div style={{ width: '42%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
              <div style={{ position: 'absolute', left: '42%', top: -3, width: 9, height: 9, background: '#fff', borderRadius: '50%', transform: 'translateX(-50%)' }} />
            </div>
            <span>1h 07m</span>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            <span><I name="cc" size={14}/> Subtitles</span>
            <span><I name="volume" size={14}/> Audio</span>
            <span style={{ marginLeft: 'auto' }}><I name="fullscreen" size={14}/></span>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

// ============ WEB / DESKTOP HOME ============
function WebHome() {
  const { HERO, MOVIES, CONTINUE } = window.DATA;
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '16px 32px', borderBottom: '1px solid var(--border-soft)', background: 'rgba(7,7,10,0.8)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={28} radius={7} />
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>CouchPotato<span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Player</span></div>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, fontWeight: 500 }}>
          {['Home','Live TV','Movies','Series','Favorites'].map((t, i) => (
            <span key={t} style={{ color: i === 0 ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === 0 ? 700 : 500 }}>{t}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-soft)', width: 280 }}>
            <I name="search" size={14} stroke="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Search titles, channels, actors…</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }} className="mono">⌘K</span>
          </div>
          <I name="cast" size={18} stroke="var(--text-dim)" />
          <div style={{ width: 30, height: 30, borderRadius: 15, background: 'linear-gradient(135deg, #ff5e3a, #6b5bff)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }}>MB</div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', height: 420 }}>
        <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(7,7,10,0.92) 0%, rgba(7,7,10,0.5) 45%, transparent 75%), linear-gradient(0deg, var(--bg), transparent 35%)', zIndex: 2 }} />
        <div style={{ position: 'relative', zIndex: 3, padding: '50px 44px', maxWidth: 620, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>New Season · Thriller</div>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, marginTop: 12 }}>{HERO.t}</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.55, maxWidth: 520 }}>{HERO.desc}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button className="btn btn-primary" style={{ padding: '12px 22px', fontSize: 14 }}><I name="play" size={16}/> Play</button>
            <button className="btn btn-ghost" style={{ padding: '12px 18px', fontSize: 14 }}><I name="plus" size={14}/> My List</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 32px', overflow: 'hidden' }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Continue Watching</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {CONTINUE.slice(0, 5).map((c, i) => (
            <div key={i}>
              <Backdrop genre={c.g} style={{ aspectRatio: '16/10', borderRadius: 10, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.8), transparent 55%)', zIndex: 2 }} />
                <div style={{ position: 'absolute', left: 10, right: 10, bottom: 14, zIndex: 3, fontSize: 11, fontWeight: 700 }}>{c.t}</div>
                <div style={{ position: 'absolute', left: 10, right: 10, bottom: 6, zIndex: 3, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                  <div style={{ width: `${c.p*100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                </div>
              </Backdrop>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ FAVORITES / RECENT — TV ============
function FavoritesRecentTV() {
  const { MOVIES, SERIES, CONTINUE } = window.DATA;
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text)', display: 'flex' }}>
      <aside style={{ width: 220, padding: 22, borderRight: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="eyebrow" style={{ padding: '0 10px', marginBottom: 8 }}>Collection</div>
        {[['heart','Favorites',true],['history','Continue'],['bookmark','Watchlist'],['download','Downloads']].map(([ic,lb,a], i) => (
          <div key={i} className={a ? 'tv-focus' : ''} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: a ? 'var(--accent)' : 'transparent', color: a ? '#fff' : 'var(--text-dim)', fontSize: 13, fontWeight: a ? 700 : 500 }}>
            <I name={ic} size={18} />{lb}
          </div>
        ))}
      </aside>
      <div style={{ flex: 1, padding: 40, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>Favorites</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mono">· 38 titles</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {['All','Movies','Series','Live'].map((t,i) => (
              <span key={t} className="pill" style={i === 0 ? { background: 'var(--accent)', color: '#fff' } : {}}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {[...MOVIES, ...SERIES].slice(0, 18).map((m, i) => (
            <div key={i} className={i === 2 ? 'tv-focus' : ''} style={{ borderRadius: 10 }}>
              <Poster genre={m.g} title={m.t} year={m.y} rating={m.r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ ALT Home (variant B) — Big Cinema, posters as rail dominance ============
function HomeTVCinematic() {
  const { HERO, MOVIES } = window.DATA;
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', color: 'var(--text)', position: 'relative', overflow: 'hidden' }}>
      <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #000 20%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)', zIndex: 2 }} />
      {/* Floating top-nav */}
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '22px 48px', display: 'flex', alignItems: 'center', gap: 28, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={28} radius={7} />
          <div style={{ fontWeight: 800, fontSize: 14 }}>CouchPotato<span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Player</span></div>
        </div>
        {['Home','Live','Movies','Series','Search'].map((t, i) => (
          <span key={t} className={i === 0 ? 'tv-focus' : ''} style={{ fontSize: 13, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)', padding: '6px 12px', borderRadius: 8 }}>{t}</span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <I name="search" size={18} stroke="rgba(255,255,255,0.7)" />
          <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg, #ff5e3a, #6b5bff)', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>MB</div>
        </div>
      </nav>
      {/* Hero text bottom-left */}
      <div style={{ position: 'absolute', left: 60, bottom: 280, zIndex: 3, maxWidth: 540 }}>
        <div className="eyebrow" style={{ color: 'var(--accent)' }}>Now streaming</div>
        <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.9, marginTop: 10 }}>{HERO.t}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 16, lineHeight: 1.55 }}>{HERO.desc}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" style={{ padding: '14px 26px', fontSize: 14 }}><I name="play" size={16}/> Play</button>
          <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)', padding: '14px 22px' }}><I name="plus" size={14}/> My List</button>
        </div>
      </div>
      {/* Posters rail */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, padding: '0 60px', zIndex: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Because you watched Silhouette</div>
        <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
          {MOVIES.slice(0, 10).map((m, i) => (
            <div key={i} className={i === 3 ? 'tv-focus' : ''} style={{ flex: '0 0 140px', borderRadius: 8, overflow: 'hidden' }}>
              <Poster genre={m.g} title={m.t} year={m.y} rating={m.r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SeriesDetailTV, WelcomeScreen, PlayerLiveTV, PlayerMobile, WebHome, FavoritesRecentTV, HomeTVCinematic });
