// TV Screens — HomeTV, LiveTV Grid EPG, LiveTV Cards EPG, MoviesTV, PlayerVOD
const { useState: useStateTV } = React;

// ============ HOME — TV (10-foot UI, sidebar + hero + rails) ============
function HomeTVScreen() {
  const { HERO, CONTINUE, MOVIES, SERIES } = window.DATA;
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{ width: 230, padding: '28px 14px', borderRight: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 6, background: 'linear-gradient(180deg, #0c0c12, #07070a)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 22px' }}>
          <BrandMark size={32} radius={8} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>CouchPotato</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Player</div>
          </div>
        </div>
        {[
          ['home', 'Home', true],
          ['tv', 'Live TV', false],
          ['movie', 'Movies', false],
          ['series', 'Series', false],
          ['heart', 'Favorites', false],
          ['history', 'Recent', false],
          ['search', 'Search', false],
          ['settings', 'Settings', false],
        ].map(([icon, label, active], i) => (
          <div key={i} className={active ? 'tv-focus' : ''} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
            borderRadius: 10,
            background: active ? 'var(--accent)' : 'transparent',
            color: active ? '#fff' : 'var(--text-dim)',
            fontWeight: active ? 700 : 500,
            fontSize: 15,
            transform: active ? undefined : 'none',
            boxShadow: active ? 'var(--shadow-focus)' : 'none',
          }}>
            <I name={icon} size={20} />{label}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '14px 12px', borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #ff5e3a, #6b5bff)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>MB</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Main · Xtream</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>24,182 channels</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Hero */}
        <section style={{ height: 360, position: 'relative', overflow: 'hidden' }}>
          <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(7,7,10,0.92) 0%, rgba(7,7,10,0.55) 45%, rgba(7,7,10,0) 80%), linear-gradient(0deg, var(--bg) 0%, rgba(7,7,10,0) 40%)', zIndex: 2 }} />
          <div style={{ position: 'relative', zIndex: 3, padding: '50px 52px', maxWidth: 560, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>Premiere · New season</div>
            <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 12 }}>{HERO.t}</div>
            <div style={{ fontSize: 15, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.5 }}>{HERO.desc}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
              <span>★ {HERO.r}</span><span>·</span><span>{HERO.s}</span><span>·</span><span>{HERO.genre}</span><span>·</span><span style={{ padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 10 }}>{HERO.mpa}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-primary tv-focus" style={{ padding: '12px 22px', fontSize: 14 }}><I name="play" size={16}/> Play S2 · E15</button>
              <button className="btn btn-ghost" style={{ padding: '12px 18px', fontSize: 14 }}><I name="plus" size={16}/> My List</button>
              <button className="btn btn-ghost" style={{ padding: '12px 14px', fontSize: 14 }}><I name="info" size={16}/></button>
            </div>
          </div>
        </section>

        {/* Continue watching */}
        <section style={{ padding: '18px 52px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Continue Watching</h3>
            <span className="eyebrow">See all <I name="chevronR" size={12}/></span>
          </div>
          <div style={{ display: 'flex', gap: 14, overflow: 'hidden' }}>
            {CONTINUE.slice(0, 5).map((c, i) => (
              <div key={i} style={{ flex: '0 0 200px' }}>
                <div className={i === 0 ? 'tv-focus' : ''} style={{ borderRadius: 10, overflow: 'hidden' }}>
                  <Backdrop genre={c.g} style={{ aspectRatio: '16/10', borderRadius: 10 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent 55%)', zIndex: 2 }} />
                    <div style={{ position: 'absolute', left: 10, right: 10, bottom: 22, zIndex: 3, fontWeight: 700, fontSize: 12, color: '#fff' }}>{c.t}</div>
                    <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 3, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                      <div style={{ width: `${c.p * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                    </div>
                  </Backdrop>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{c.ep} · {c.left}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Movies rail */}
        <section style={{ padding: '14px 52px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Trending Movies</h3>
          </div>
          <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
            {MOVIES.slice(0, 7).map((m, i) => (
              <div key={i} style={{ flex: '0 0 130px' }}>
                <Poster genre={m.g} title={m.t} year={m.y} rating={m.r} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// ============ LIVE TV — EPG GRID (classic horizontal) ============
function EPGGridScreen() {
  const { CHANNELS, EPG_TIMES, EPG_PROGRAMS } = window.DATA;
  const slotW = 110;
  const nowSlot = 4; // 20:00
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
      {/* Topbar */}
      <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>TV Guide</div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 20 }}>
          {['All', 'News', 'Sports', 'Movies', 'Docu', 'Kids'].map((c, i) => (
            <span key={c} className="pill" style={i === 0 ? { background: 'var(--accent)', color: '#fff' } : {}}>{c}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
          <I name="clock" size={14} />
          <span className="mono">Thu · 20:04</span>
        </div>
      </div>

      {/* Timebar */}
      <div style={{ display: 'flex', paddingLeft: 220, position: 'relative', borderBottom: '1px solid var(--border-soft)' }}>
        {EPG_TIMES.map((t, i) => (
          <div key={t} style={{ width: slotW, padding: '8px 0', fontSize: 11, fontWeight: 600, color: i === nowSlot ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {t}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Now line */}
        <div style={{ position: 'absolute', left: 220 + nowSlot * slotW + 10, top: 0, bottom: 0, width: 2, background: 'var(--accent)', zIndex: 10, boxShadow: '0 0 12px var(--accent)' }}>
          <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, background: 'var(--accent)', borderRadius: '50%' }} />
        </div>

        {CHANNELS.slice(0, 8).map((ch, rowI) => (
          <div key={ch.num} style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', height: 64, alignItems: 'stretch' }}>
            {/* Channel cell */}
            <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRight: '1px solid var(--border-soft)', background: 'var(--bg-2)' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', width: 28 }}>{ch.num}</span>
              <Logo letter={ch.logo} bg={ch.bg} size={32} />
              <div style={{ fontSize: 12, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</div>
            </div>
            {/* Programme blocks */}
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
              {(EPG_PROGRAMS[ch.num] || []).map((p, i) => {
                const [start, dur, title] = p;
                const left = (start - 18) * 2 * (slotW / 2);
                const width = dur * (slotW / 2) * 2 - 4;
                const isNow = start <= 20 && start + dur > 20;
                const isFocus = rowI === 2 && isNow;
                return (
                  <div key={i} className={isFocus ? 'tv-focus' : ''} style={{
                    position: 'absolute', left, top: 8, height: 48, width,
                    background: isNow ? 'linear-gradient(135deg, rgba(255,94,58,0.22), rgba(255,94,58,0.08))' : 'var(--surface)',
                    border: `1px solid ${isNow ? 'var(--accent)' : 'var(--border-soft)'}`,
                    borderRadius: 8, padding: '6px 10px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, overflow: 'hidden',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="mono">{`${Math.floor(start)}:${(start%1)*60===0?'00':'30'} – ${Math.floor(start+dur)}:${((start+dur)%1)*60===0?'00':'30'}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ LIVE TV — CARDS (now/next vertical list) ============
function EPGCardsScreen() {
  const { CHANNELS } = window.DATA;
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', color: 'var(--text)' }}>
      {/* Now-playing preview */}
      <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', gap: 18, background: 'linear-gradient(135deg, #0a0f18 0%, var(--bg) 70%)' }}>
        <div style={{ aspectRatio: '16/9', borderRadius: 16, background: 'linear-gradient(135deg, #0a2a5a, #1a0f4a)', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 50%, rgba(255,255,255,0.08), transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8 }}>
            <span className="pill live">LIVE</span>
            <span className="pill"><I name="signal" size={10}/> HD · 1080p</span>
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>SKY CINEMA · 20:00–22:18</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>Dune: Part Two</div>
          </div>
        </div>
        <div>
          <div className="eyebrow">Now on Sky Cinema</div>
          <div style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 8, maxWidth: 560 }}>
            Paul Atreides unites with the Fremen to wage war against the conspirators who destroyed his family. Directed by Denis Villeneuve.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary tv-focus"><I name="play" size={14}/> Watch Live</button>
            <button className="btn btn-ghost"><I name="plus" size={14}/> Record</button>
            <button className="btn btn-ghost"><I name="info" size={14}/> Details</button>
          </div>
        </div>
      </div>

      {/* Channel list */}
      <div style={{ width: 420, borderLeft: '1px solid var(--border-soft)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <I name="tv" size={18} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Live Channels</div>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>142 on air</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {CHANNELS.slice(0, 8).map((ch, i) => (
            <div key={ch.num} className={i === 4 ? 'tv-focus' : ''} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              background: i === 4 ? 'rgba(255,94,58,0.1)' : 'transparent',
              borderLeft: i === 4 ? '3px solid var(--accent)' : '3px solid transparent',
            }}>
              <Logo letter={ch.logo} bg={ch.bg} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ch.num}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>● </span>{ch.now}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Next · {ch.next}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ MOVIES BROWSER — TV ============
function MoviesBrowserTV() {
  const { MOVIES, CATEGORIES } = window.DATA;
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
      {/* Top */}
      <div style={{ padding: '22px 48px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>Movies</div>
        <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden' }}>
          {CATEGORIES.map((c, i) => (
            <span key={c} className={i === 1 ? 'pill tv-focus' : 'pill'} style={i === 1 ? { background: 'var(--accent)', color: '#fff' } : {}}>{c}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '8px 12px' }}><I name="filter" size={14}/></button>
          <button className="btn btn-ghost" style={{ padding: '8px 12px' }}><I name="grid" size={14}/></button>
        </div>
      </div>

      {/* Featured strip */}
      <div style={{ padding: '0 48px 20px' }}>
        <Backdrop genre={MOVIES[0].g} style={{ height: 220, borderRadius: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, transparent 60%)', zIndex: 2 }} />
          <div style={{ position: 'absolute', inset: 0, padding: '28px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 3, maxWidth: 520 }}>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>Editor's Pick · Drama</div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 6 }}>{MOVIES[0].t}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>{MOVIES[0].desc}</div>
          </div>
        </Backdrop>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: '0 48px', overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>All · Drama <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· 412 titles</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14 }}>
          {MOVIES.slice(0, 14).map((m, i) => (
            <div key={i} className={i === 4 ? 'tv-focus' : ''} style={{ borderRadius: 10 }}>
              <Poster genre={m.g} title={m.t} year={m.y} rating={m.r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ PLAYER — VOD (TV) ============
function PlayerVODScreen() {
  const { HERO } = window.DATA;
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden', color: '#fff' }}>
      <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%', filter: 'brightness(0.55)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '26px 36px', display: 'flex', alignItems: 'center', gap: 16, zIndex: 5, background: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent)' }}>
        <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="back" size={16}/> Back</button>
        <div style={{ marginLeft: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Season 2 · Episode 15</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Cold Harbor — The Shearing</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="cast" size={16}/></button>
          <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="cc" size={16}/></button>
          <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="settings" size={16}/></button>
        </div>
      </div>

      {/* Center controls */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 38, zIndex: 5 }}>
        <button style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <I name="skip15r" size={28} />
        </button>
        <button className="tv-focus" style={{ width: 92, height: 92, borderRadius: '50%', background: 'var(--accent)', border: 'none', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <I name="play" size={38} />
        </button>
        <button style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <I name="skip15" size={28} />
        </button>
      </div>

      {/* Bottom controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '30px 36px 26px', zIndex: 5, background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.8)' }}>
          <span>28:14</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' }}>
            <div style={{ width: '42%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
            <div style={{ position: 'absolute', left: '42%', top: -4, width: 12, height: 12, background: '#fff', borderRadius: '50%', transform: 'translateX(-50%)' }} />
          </div>
          <span>1h 07m</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <I name="volume" size={18} />
            <div style={{ width: 100, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
              <div style={{ width: '65%', height: '100%', background: '#fff', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }} className="mono">KSPlayer · HEVC 1080p · 8.1 ch · 14.2 Mbps</div>
          <button className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)' }}><I name="fullscreen" size={14}/> Fullscreen</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeTVScreen, EPGGridScreen, EPGCardsScreen, MoviesBrowserTV, PlayerVODScreen });
