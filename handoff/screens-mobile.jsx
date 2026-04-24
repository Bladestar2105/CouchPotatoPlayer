// Mobile screens & additional views
const { useState: useStateM } = React;

// ============ HOME — Mobile ============
function HomeMobile() {
  const { HERO, CONTINUE, MOVIES, SERIES } = window.DATA;
  return (
    <MobileFrame>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        {/* App bar */}
        <div style={{ padding: '6px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={28} radius={7} />
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>CouchPotato<span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Player</span></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
            <I name="search" size={20} stroke="var(--text-dim)" />
            <I name="cast" size={20} stroke="var(--text-dim)" />
          </div>
        </div>

        {/* Hero card */}
        <div style={{ padding: '0 16px' }}>
          <Backdrop genre={HERO.g} style={{ height: 360, borderRadius: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(7,7,10,0.92), transparent 55%)', zIndex: 2 }} />
            <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 3 }}>
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>Season 2 · New</div>
              <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1 }}>{HERO.t}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>★ {HERO.r} · {HERO.genre} · {HERO.mpa}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}><I name="play" size={14}/> Play</button>
                <button className="btn btn-ghost" style={{ padding: '11px 14px' }}><I name="plus" size={16}/></button>
                <button className="btn btn-ghost" style={{ padding: '11px 14px' }}><I name="info" size={16}/></button>
              </div>
            </div>
          </Backdrop>
        </div>

        {/* Quick tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '18px 16px 8px', overflow: 'hidden' }}>
          {['For You', 'Live', 'Movies', 'Series', 'Kids'].map((t, i) => (
            <span key={t} className="pill" style={i === 0 ? { background: 'var(--accent)', color: '#fff' } : {}}>{t}</span>
          ))}
        </div>

        {/* Continue */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Continue</div>
            <div className="eyebrow">See all</div>
          </div>
          <div className="hide-scroll" style={{ display: 'flex', gap: 10 }}>
            {CONTINUE.slice(0, 4).map((c, i) => (
              <div key={i} style={{ flex: '0 0 160px' }}>
                <Backdrop genre={c.g} style={{ aspectRatio: '16/10', borderRadius: 10, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.8), transparent 55%)', zIndex: 2 }} />
                  <div style={{ position: 'absolute', left: 8, right: 8, bottom: 16, zIndex: 3, fontSize: 10, fontWeight: 700, color: '#fff' }}>{c.t}</div>
                  <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 3, height: 2, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }}>
                    <div style={{ width: `${c.p * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                </Backdrop>
              </div>
            ))}
          </div>
        </div>

        {/* Movie rail */}
        <div style={{ padding: '4px 16px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Trending Movies</div>
          <div className="hide-scroll" style={{ display: 'flex', gap: 10 }}>
            {MOVIES.slice(0, 8).map((m, i) => (
              <div key={i} style={{ flex: '0 0 110px' }}>
                <Poster genre={m.g} title={m.t} year={m.y} rating={m.r} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ marginTop: 'auto', padding: '10px 16px 20px', borderTop: '1px solid var(--border-soft)', background: 'rgba(7,7,10,0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-around' }}>
          {[['home','Home',true],['tv','Live'],['movie','Movies'],['series','Series'],['user','Me']].map(([ic, lb, a], i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: a ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>
              <I name={ic} size={22} />{lb}
            </div>
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}

// ============ MEDIA DETAIL — Mobile ============
function MediaDetailMobile() {
  const { HERO } = window.DATA;
  return (
    <MobileFrame>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ height: 480, position: 'relative' }}>
          <Backdrop genre={HERO.g} style={{ position: 'absolute', inset: 0, borderRadius: 0, height: '100%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, var(--bg) 5%, rgba(7,7,10,0.3) 55%, rgba(7,7,10,0.55) 100%)', zIndex: 2 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 }}>
            <StatusBar />
            <div style={{ padding: '6px 16px 0', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}><I name="back" size={18} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}><I name="share" size={18} /></div>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}><I name="heart" size={18} /></div>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20, zIndex: 3 }}>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>Season 2 · Premiere</div>
            <div style={{ fontWeight: 900, fontSize: 38, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 6 }}>{HERO.t}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10, display: 'flex', gap: 8 }}>
              <span>★ {HERO.r}</span><span>·</span><span>{HERO.y}</span><span>·</span><span>{HERO.genre}</span><span style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 3 }}>{HERO.mpa}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 0', fontSize: 14 }}><I name="play" size={16}/> Play Episode 1</button>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18, color: 'var(--text-dim)', fontSize: 10, fontWeight: 600 }}>
            {[['plus','My List'],['download','Download'],['info','Trailer'],['share','Share']].map(([ic,lb],i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <I name={ic} size={20} />{lb}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 18 }}>{HERO.desc}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 18, borderBottom: '1px solid var(--border-soft)', paddingBottom: 10 }}>
            {['Episodes','Trailers','Similar','Details'].map((t, i) => (
              <div key={t} style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--text)' : 'var(--text-muted)', paddingBottom: 10, borderBottom: i === 0 ? '2px solid var(--accent)' : 'none', marginBottom: -11 }}>{t}</div>
            ))}
          </div>
          {[1,2,3].map(n => (
            <div key={n} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ width: 110, aspectRatio: '16/10', borderRadius: 8, background: 'linear-gradient(135deg, #1a0b1f, #3a0f2a)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>46:12</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{n}. {['The Shearing','Ice Widow','Father\u2019s Case'][n-1]}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  {['Aline returns to Cold Harbor and reopens her father\u2019s file.','A body turns up where no body should be.','The village chooses sides.'][n-1]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}

// ============ SEARCH — Mobile ============
function SearchMobile() {
  const { MOVIES, SERIES } = window.DATA;
  return (
    <MobileFrame>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)' }}>
        <StatusBar />
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
            <I name="search" size={18} stroke="var(--text-dim)" />
            <div style={{ flex: 1, fontSize: 14 }}>cold harb</div>
            <I name="close" size={16} stroke="var(--text-muted)" />
          </div>
          <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>Cancel</div>
        </div>

        <div style={{ padding: '8px 16px 0' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Top results</div>
          <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 62, aspectRatio: '2/3', borderRadius: 6, background: 'linear-gradient(145deg, #1a0b1f, #3a0f2a)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Cold Harbor</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Series · 2 Seasons · Thriller</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <span className="pill" style={{ fontSize: 9 }}>★ 8.7</span>
                <span className="pill" style={{ fontSize: 9 }}>TV‑MA</span>
                <span className="pill" style={{ fontSize: 9 }}>2024</span>
              </div>
            </div>
            <I name="play" size={18} stroke="var(--accent)" />
          </div>
          {['Cold Case','The Cold', 'Harbor Lights'].map((t, i) => (
            <div key={t} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <I name="search" size={16} stroke="var(--text-muted)" />
                <span style={{ fontSize: 14 }}>{t}</span>
              </div>
              <I name="chevronR" size={16} stroke="var(--text-muted)" />
            </div>
          ))}

          <div className="eyebrow" style={{ marginTop: 20, marginBottom: 10 }}>Live channels matching</div>
          {[['Sky Cinema','S','#0a2a5a'],['DAZN 1 HD','DZ','#1f1f26']].map(([n,l,bg], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <Logo letter={l} bg={bg} size={32} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
              <span className="pill live" style={{ marginLeft: 'auto', fontSize: 9 }}>LIVE</span>
            </div>
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}

// ============ ONBOARDING — Mobile (provider setup) ============
function OnboardingMobile() {
  return (
    <MobileFrame>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center' }}>
          <I name="back" size={22} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <div style={{ width: 24, height: 3, borderRadius: 2, background: 'var(--accent)' }} />
            <div style={{ width: 24, height: 3, borderRadius: 2, background: 'var(--accent)' }} />
            <div style={{ width: 24, height: 3, borderRadius: 2, background: 'var(--surface-2)' }} />
          </div>
        </div>
        <div style={{ padding: '12px 24px 20px' }}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>Step 2 of 3</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1.1 }}>Connect your IPTV provider</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.5 }}>Your credentials stay on device. We never see them.</div>
        </div>

        {/* Segmented */}
        <div style={{ padding: '4px 24px' }}>
          <div style={{ display: 'flex', padding: 4, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
            {['Xtream Codes', 'M3U Playlist'].map((t, i) => (
              <div key={t} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 9, background: i === 0 ? 'var(--surface-3)' : 'transparent', fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--text)' : 'var(--text-muted)' }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['Profile name', 'Living Room TV', 'user'],
            ['Server URL', 'http://xc.example.com:8080', 'globe2'],
            ['Username', 'mainbox_de', 'user'],
            ['Password', '••••••••••••', 'shield'],
          ].map(([lb, v, ic], i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>{lb}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'var(--surface)', borderRadius: 12, border: `1px solid ${i === 1 ? 'var(--accent)' : 'var(--border-soft)'}`, boxShadow: i === 1 ? '0 0 0 3px var(--accent-soft)' : 'none' }}>
                <I name={ic} size={16} stroke="var(--text-muted)" />
                <div style={{ fontSize: 14, flex: 1, fontFamily: i >= 1 ? 'var(--font-mono)' : 'var(--font-sans)', color: i === 3 ? 'var(--text)' : 'var(--text)' }}>{v}</div>
                {i === 1 && <span className="pill" style={{ fontSize: 9, background: 'rgba(61,220,151,0.15)', color: 'var(--success)' }}>✓ Reachable</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '16px 20px 28px', borderTop: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            <I name="shield" size={14} />Credentials stored in device keychain only.
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 0', fontSize: 14 }}>Test & Continue <I name="arrowR" size={14}/></button>
        </div>
      </div>
    </MobileFrame>
  );
}

// ============ SETTINGS — Mobile ============
function SettingsMobile() {
  const sections = [
    ['Account', [['Profiles','2 profiles','user'],['Parental PIN','Set','shield'],['Sign out','','back']]],
    ['Playback', [['Preferred player','KSPlayer','play'],['HDR','Auto (Dolby Vision)','sparkle'],['Audio language','Deutsch · Original','globe'],['Subtitles','Off','cc']]],
    ['Data & storage', [['Image cache','248 MB','download'],['EPG refresh','Every 4 hours','refresh'],['Wi‑Fi only downloads','On','wifi']]],
    ['About', [['Version','1.8.3 (build 4210)','info'],['Privacy','','shield'],['Open source licenses','','info']]],
  ];
  return (
    <MobileFrame>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)' }}>
        <StatusBar />
        <div style={{ padding: '12px 20px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <I name="back" size={22} />
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Settings</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {/* Profile card */}
          <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border-soft)', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #ff5e3a, #6b5bff)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>MB</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Main · Xtream</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>24,182 channels · 6,041 movies · 842 series</div>
            </div>
            <I name="chevronR" size={18} stroke="var(--text-muted)" />
          </div>

          {sections.map(([title, items]) => (
            <div key={title} style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8, paddingLeft: 4 }}>{title}</div>
              <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
                {items.map(([lb, val, ic], i) => (
                  <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
                      <I name={ic} size={15} stroke="var(--text-dim)" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{lb}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{val}</div>
                    <I name="chevronR" size={14} stroke="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}

Object.assign(window, { HomeMobile, MediaDetailMobile, SearchMobile, OnboardingMobile, SettingsMobile });
