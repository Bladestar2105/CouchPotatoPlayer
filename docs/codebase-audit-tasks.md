# Vorschläge aus Codebasis-Review (aktualisiert)

Stand dieser Liste: **10. April 2026**.

## Erledigt / bereits umgesetzt

### 1) Image-Proxy unterstützt HTTP **und** HTTPS

**Status**
- Die Proxy-Logik erkennt bereits `http://` und `https://` per Regex.

**Code-Hinweis**
- `utils/imageProxy.ts` nutzt `^https?:\/\/` und proxyt dann über `/proxy/...`.

---

### 2) Unit-Tests für Image-Proxy sind vorhanden

**Status**
- Es existieren Unit-Tests inklusive HTTPS-Regressionstest.

**Code-Hinweis**
- `utils/__tests__/imageProxy.test.ts` enthält Fälle für HTTP, HTTPS, relative URLs und Cache-Stabilität.

---

### 3) TMDB-Bildbasis ist konsistent

**Status**
- `TMDB_IMAGE_BASE` ist korrekt (`https://image.tmdb.org/t/p`) und wird für Poster/Backdrop-URLs genutzt.

**Code-Hinweis**
- `services/tmdb.ts` verwendet `buildTmdbImageUrl(...)` zentral.

---

## Offene, priorisierte Aufgaben

### 1) i18n-Testisolation verbessern (verhindert suite-übergreifende Nebenwirkungen)

**Status**
- ✅ Erledigt.

**Beobachtung**
- In Tests werden i18n-Ressourcen dynamisch ergänzt; ohne Cleanup kann das andere Tests beeinflussen.

**Warum wichtig**
- Vermeidet flakige Tests und schwer nachvollziehbare Reihenfolgeabhängigkeiten.

**Vorschlag (Task)**
- Testdaten nach jedem manipulativen i18n-Test explizit entfernen oder in isolierter i18n-Instanz testen.

**Akzeptanzkriterien**
- `bun test utils/__tests__` ist stabil grün, unabhängig von Test-Reihenfolge.

---

### 2) Start-Performance: AsyncStorage-Reads parallelisieren

**Status**
- ✅ Erledigt.

**Beobachtung**
- In `context/IPTVContext.tsx` und `context/SettingsContext.tsx` werden viele Storage-Reads seriell ausgeführt.

**Warum wichtig**
- Kann die Zeit bis zur ersten interaktiven Ansicht erhöhen (insbesondere auf TV-Geräten).

**Vorschlag (Task)**
- Reads per `multiGet` oder `Promise.all` bündeln; Parsing/Fehlerbehandlung beibehalten.

**Akzeptanzkriterien**
- Kein Regressionsverhalten bei beschädigten Storage-Einträgen.
- Messbar reduzierte Initialisierungszeit im Profiling.

---

### 3) Context-Granularität erhöhen (Rerender-Last senken)

**Status**
- 🟡 In Arbeit (Playback- und Library-Slices extrahiert; erste Consumer migriert: `VideoPlayer`, `EpisodeScreen`, `PlayerScreen`, `ChannelList`, `SearchScreen`, `MediaInfoScreen`, `FavoritesList`, `RecentlyWatchedList`, `MovieList`, `SeriesList`).

**Beobachtung**
- `IPTVContext` bündelt viele Zustände/Funktionen in einem Provider.

**Warum wichtig**
- Änderungen an Teilzuständen können unnötige Rerender in vielen Consumer-Komponenten auslösen.

**Vorschlag (Task)**
- Kontext in fachliche Teil-Provider aufsplitten (z. B. Profile, Playback, EPG, Favoriten) oder selector-basierten Zugriff einführen.

**Akzeptanzkriterien**
- Messbar weniger Rerender bei häufigen Updates (z. B. Playback/EPG).
- Keine API-Regression für bestehende Screens.

---

### 4) FlatList-Renderpfade konsolidieren (UI-Performance bei großen Katalogen)

**Beobachtung**
- In mehreren Listen (`ChannelList`, `MovieList`, `SeriesList`) gibt es weiterhin komplexe Renderpfade mit vielen Closures/State-Abhängigkeiten.

**Warum wichtig**
- Bei großen Provider-Listen können zusätzliche Re-Renders und Closure-Neuerzeugungen die Scroll-/Focus-Performance auf TV-Geräten beeinträchtigen.

**Vorschlag (Task)**
- `renderItem`/`keyExtractor`/Handler weiter stabilisieren (`useCallback`, ggf. dedizierte Row-Komponenten).
- Profiling auf Zielgeräten (Android TV/tvOS) und Feintuning von `windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews`.

**Akzeptanzkriterien**
- Kein Regression in Fokus-Navigation.
- Spürbar flüssigeres Scrollen auf großen Listen (praktischer Geräte-Check).
