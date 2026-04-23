# UHF-like Produkt-Roadmap (ohne Trakt/DVR)

Stand: 2026-04-14 (aktualisiert)

Diese Roadmap priorisiert Features für ein "UHF-ähnliches" Nutzungserlebnis in CouchPotatoPlayer, **ohne** Trakt-Integration und **ohne** Aufnahmefunktion (DVR).

---

## Fortschritt (bereits umgesetzt)

- ✅ EPG Quick-Jumps (`Jetzt`, `+2h`, `Abend`)
- ✅ EPG Favoritenfilter (Toggle im Timeline-Header)
- ✅ Player: "Letzter Sender" Shortcut (Overlay + Remote)
- ✅ Player: Basis-Statusbadge (`Live` / `Buffering`)
- ✅ Player: Statusbadge erweitert (`Reconnecting` / `Failed`)
- ✅ Player: Smart-Reconnect (Retry + Backoff)
- ✅ EPG: Fokus-Preview (Mini-Infos beim Navigieren)
- ✅ EPG: Skeleton/Placeholder bei Ladezeiten > 250 ms

---

## Ziele

1. Sehr schnelle und intuitive Live-TV-Erfahrung (EPG zuerst).
2. Modernes Home/Discovery-Erlebnis mit klaren Empfehlungen.
3. Zuverlässige Playback-Experience auf TV- und Mobile-Geräten.
4. Solides Fundament für spätere Cloud-Synchronisierung.

---

## Priorisierte Backlog-Items

## P0 (sofort starten)

### EPG Performance & UX
- [ ] Virtuelle EPG-Timeline (nur sichtbare Rows/Slots rendern).
- [x] Quick-Jumps: `Jetzt`, `+2h`, `Heute Abend`.
- [x] Sender-Favoritenfilter im EPG.
- [x] Fokus-Preview (kanalbezogene Mini-Infos beim Navigieren).
- [x] Skeleton/Placeholder bei Daten-Ladezeiten > 250 ms.

**Akzeptanzkriterien**
- EPG-Scroll bleibt auf TV flüssig (subjektiv "ohne Ruckeln").
- Wechsel zwischen Zeitblöcken in < 200 ms.
- Favoritenfilter ist persistent pro Profil.

### Playback Stabilität
- [x] Smart-Reconnect bei Stream-Fehlern (retry/backoff).
- [x] Klarer Status im UI: buffering / reconnecting / failed.
- [x] Schnellzugriff auf Audio-/Untertitelspuren.
- [x] "Letzter Sender" Shortcut.

**Akzeptanzkriterien**
- Reconnect wird automatisch gestartet, wenn Netzwerk kurz aussetzt.
- User bekommt nie "stummes" Hängen ohne Statusmeldung.

### TV-Remote Fokusqualität
- [ ] Einheitliche Fokus-Reihenfolge (D-Pad).
- [ ] Sichtbare Fokuszustände in allen Hauptlisten.
- [ ] Konsistentes Back-Verhalten (kein unerwarteter Exit).

**Akzeptanzkriterien**
- Keine Fokus-Fallen in Home/EPG/Search.
- Back-Flow ist auf allen Hauptscreens gleich.

---

## P1 (nach P0)

### Home & Discovery Redesign
- [ ] Reihenfolge auf Home: `Continue Watching`, `Live Now`, `Neu hinzugefügt`.
- [ ] Pro Provider und global kombinierte Reihen.
- [ ] Schnellaktionen auf Kacheln: Favorit, Ausblenden, Direktstart.

**Akzeptanzkriterien**
- Home zeigt sofort fortsetzbare Inhalte.
- Erste Interaktion zum Start eines Streams in <= 3 Aktionen.

### Globale Suche v1
- [ ] Suche über Live/Filme/Serien gleichzeitig.
- [ ] Ergebnis-Tabs je Inhaltstyp.
- [ ] Debounced Suche + Empty-State + Fehlertoleranz.

**Akzeptanzkriterien**
- Suchergebnisse erscheinen in < 500 ms bei lokal gecachten Daten.
- Eindeutige Trennung der Content-Typen in der UI.

### Content-Management
- [ ] Kategorien umbenennen/sortieren/ausblenden.
- [ ] Dubletten-Markierung (gleiches Logo/Name/Stream-URL-Ähnlichkeit).
- [ ] Provider-Priorität für Fallback-Streams.

**Akzeptanzkriterien**
- Änderungen bleiben profilbezogen gespeichert.
- Ausgeblendete Inhalte erscheinen nirgends in Standardlisten.

---

## P2 (später)

### Cloud Sync Vorbereitung (noch ohne Backend)
- [ ] Einheitliches lokales Datenmodell inkl. Schema-Version.
- [ ] Stabile IDs für Favoriten, Verlauf, Einstellungen.
- [ ] Import/Export als JSON-Backup (lokal).

**Akzeptanzkriterien**
- Daten können versionssicher serialisiert/deserialisiert werden.
- Migrationen von altem auf neues Schema laufen ohne Datenverlust.

### Cloud Sync Umsetzung (wenn priorisiert)
- [ ] Auth-Option (z. B. E-Mail-Link oder Device Code).
- [ ] End-to-End verschlüsseltes Settings-Backup.
- [ ] Konfliktstrategie: Last-write-wins + manuelle Merge-Option.

---

## Umsetzungsplan (6 Wochen)

### Woche 1–2
- P0: EPG Performance & Quick-Jumps
- P0: Fokusstabilität in EPG/Home

### Woche 3–4
- P0: Playback Stabilität (Reconnect, Status, Last Channel)
- P1: Home Redesign (erste Version)

### Woche 5
- P1: Globale Suche v1

### Woche 6
- P1: Content-Management Basis
- P2: Cloud-Sync Vorbereitung (nur Datenmodell + Backup)

---

## Messgrößen (KPIs)

- Time-to-First-Frame (Live Startzeit)
- Reconnect-Erfolgsrate
- EPG-Navigationslatenz
- Suche: Zeit bis Ergebnis
- 7-Tage-Retention nach Home/EPG-Redesign

---

## Nächste konkrete Tickets (Startpaket)

1. `EPG: virtuelle Liste + Zeitfenster-Paging`
2. `TV UX: Fokuspfad-Audit Home/EPG/Search`
3. `Home: Continue Watching + Live Now Reihen`
4. `Search: globale Suche mit Tabs`
5. `Player: Audio-/Untertitel-Schnellzugriff`
   Erledigt: Overlay-Actions plus vereinheitlichte Track-Erkennung und native Selektion über alle Player.
6. `Home: Pro Provider und global kombinierte Reihen`
