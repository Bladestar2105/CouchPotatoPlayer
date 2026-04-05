# Vorschläge aus Codebasis-Review

## 1) Aufgabe: Tippfehler korrigieren (TMDB-Kommentar)

**Beobachtung**
- In `services/tmdb.ts` steht im Kommentar `lets` statt `let's`.

**Warum wichtig**
- Kleine Tippfehler in Kommentaren senken die Lesbarkeit und wirken unprofessionell.

**Vorschlag (Task)**
- Korrigiere den Tippfehler im Kommentar und formuliere den Satz klarer.

**Akzeptanzkriterien**
- Der Kommentar enthält keinen Tippfehler mehr (`let's` oder eine komplett überarbeitete Formulierung).
- Der Kommentar beschreibt nachvollziehbar, warum die gewählte URL verwendet wird.

---

## 2) Aufgabe: Programmierfehler korrigieren (HTTPS wird im Image-Proxy nicht berücksichtigt)

**Beobachtung**
- `utils/imageProxy.ts` proxyt nur URLs mit `http://`, aber nicht `https://`.
- Dadurch werden viele moderne Bildquellen nicht über `/proxy/` geleitet.

**Warum wichtig**
- Bei Web-Deployments können dadurch CORS-Probleme oder inkonsistentes Verhalten auftreten.

**Vorschlag (Task)**
- Erweitere die Proxy-Logik, sodass sowohl `http://` als auch `https://` erkannt werden.
- Optional: Nutze eine robustere Protokollprüfung statt String-Matching (z. B. via URL-Parsing mit Fallback).

**Akzeptanzkriterien**
- `proxyImageUrl('http://...')` und `proxyImageUrl('https://...')` liefern jeweils einen `/proxy/...`-Pfad.
- Bestehendes Verhalten für interne/nicht-proxy-relevante URLs bleibt unverändert.

---

## 3) Aufgabe: Kommentar-/Doku-Unstimmigkeit korrigieren (TMDB-Bildbasis)

**Beobachtung**
- `TMDB_IMAGE_BASE` ist auf einen offensichtlich falschen Pfad gesetzt (`.../tremendous/t/p`) und wird im restlichen Code nicht verwendet.
- Gleichzeitig werden Bild-URLs mehrfach als Literal (`https://image.tmdb.org/t/p/...`) zusammengesetzt.

**Warum wichtig**
- Das ist eine Unstimmigkeit zwischen Kommentar, Konstante und tatsächlicher Implementierung.
- Solche Altlasten erhöhen das Risiko zukünftiger Copy/Paste-Fehler.

**Vorschlag (Task)**
- Vereinheitliche die Bild-URL-Erzeugung:
  - Entweder `TMDB_IMAGE_BASE` korrekt setzen und überall nutzen,
  - oder die tote Konstante entfernen und Kommentar bereinigen.

**Akzeptanzkriterien**
- Keine falsche/stale TMDB-Bildbasis mehr im Code.
- Genau eine zentrale Quelle für TMDB-Bildpfade (oder bewusst keine Konstante, dann ohne Widersprüche).

---

## 4) Aufgabe: Testverbesserung (Image-Proxy abdecken)

**Beobachtung**
- Es gibt aktuell keine Unit-Tests für `utils/imageProxy.ts`.

**Warum wichtig**
- Die Proxy-Entscheidung ist plattformabhängig und fehleranfällig (z. B. Protokoll, Cache-Verhalten).

**Vorschlag (Task)**
- Ergänze Tests für `proxyImageUrl` mit Fokus auf Web-Verhalten.

**Empfohlene Testfälle**
1. `http://...` wird geproxyt.
2. `https://...` wird geproxyt.
3. Nicht relevante URLs bleiben unverändert.
4. `undefined`/`null` wird korrekt behandelt.
5. Cache liefert bei erneutem Aufruf denselben Wert (idempotentes Verhalten).

**Akzeptanzkriterien**
- Neue Tests sind grün.
- Ein Regressionstest deckt explizit den HTTPS-Fall ab.
