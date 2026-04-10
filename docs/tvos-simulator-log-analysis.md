# tvOS-Simulator Log-Analyse und Maßnahmenplan

## 1) `InteractionManager has been deprecated`

**Bedeutung**
- React Native meldet, dass `InteractionManager` künftig entfernt wird.
- Im Projekt wird diese Warnung aktuell nur per `LogBox.ignoreLogs` ausgeblendet.

**Hinweis im Code**
- Die Meldung wird global ignoriert, statt die eigentliche Ursache zu beheben.

**Vorschlag zur Lösung**
1. Abhängigkeiten auf aktuelle RN-/TV-Versionen prüfen (viele Deprecation-Warnungen kommen indirekt aus Libraries).
2. Eigene lange UI-Tasks (z. B. Parsing/Grouping nach Netzwerk-Responses) in kleinere Chunks aufteilen.
3. Wo möglich `requestIdleCallback` oder `setTimeout(0)`-Chunking für nicht-kritische Nacharbeit verwenden.
4. `ignoreLogs` nur als temporäre Maßnahme verwenden und mit TODO versehen.

## 2) `[UIKitCore] RCTScrollViewComponentView implements focusItemsInRect...`

**Bedeutung**
- tvOS weist auf eingeschränkte Focus-Cache-Optimierung hin, solange ein bestimmter ScrollView/FlatList-Typ sichtbar ist.
- Das ist typischerweise **kein Crash**, aber ein Performance-/Focus-Hinweis bei komplexen verschachtelten Scroll-Containern.

**Mögliche Ursache im Projekt**
- Es gibt mehrere gleichzeitige `ScrollView`/`FlatList`-Strukturen in Listen und EPG-Ansichten.

**Vorschlag zur Lösung**
1. Verschachtelte Scroll-Container auf TV-Flows reduzieren (insb. horizontal + vertikal kombiniert).
2. Fokuspfade explizit über `nextFocus*` vereinfachen, damit tvOS weniger heuristisch suchen muss.
3. In kritischen Screens nur einen primären Scroll-Container aktiv halten.
4. Warnung vorerst monitoren; sie ist häufig systemseitig und nicht immer vollständig eliminierbar.

## 3) EPG-Logs: Mehrfaches `Starting EPG load...`

**Beobachtung**
- Die Sequenz zeigt mehrere Start-Events kurz hintereinander.
- Danach kommen teure Schritte: ~19.7 MB XML, ~62k Programme, ~1572 Channels.

**Wahrscheinliche Ursache im Projekt**
- `loadEPG()` wird in `ChannelList` per `useEffect` aufgerufen.
- Gleichzeitig wird EPG auch im Context-Lifecycle (Profil laden / Update) angestoßen.
- Es gibt keinen klaren In-Flight-Guard gegen parallele Doppelaufrufe.

**Vorschlag zur Lösung**
1. In `loadEPG` einen Request-Dedupe einführen (`isEpgLoadingRef`/Promise-Lock).
2. Trigger-Quellen konsolidieren: EPG nur an einer zentralen Stelle starten.
3. Optional: Debounce für schnelle Screen-Wechsel.
4. Für große XMLs Parsing in kleinere Chunks oder auf Background-Thread auslagern (falls Architektur es erlaubt).

## 4) `VirtualizedList: ... large list that is slow to update`

**Bedeutung**
- React Native erkennt eine große Liste mit langsamen Updates (`dt` hoch).
- Betroffen sind laut Logs v. a. `SeriesList`, `MovieList`, `ChannelList` mit häufigen Fokus-Updates.

**Mögliche Ursache im Projekt**
- Fokusänderungen (`focused*`) triggern häufig Re-Renders.
- `extraData` enthält Fokus-States; dadurch invalidiert sich die Liste oft.
- Render-Callbacks sind zwar memoized, aber viele Props ändern sich dennoch oft.

**Vorschlag zur Lösung (priorisiert)**
1. `renderItem`-Zellen in `React.memo`-Komponenten mit stabilem Props-Vergleich aufteilen.
2. `extraData` minimieren: nur wirklich benötigte Felder übergeben.
3. Fokus-Status lokal in Zelle ableiten, statt global alle Zellen neu zu invalidieren.
4. Für TV-Listen `getItemLayout` konsequent verwenden (teilweise schon vorhanden).
5. Diagnostik-Hook (`useRenderDiagnostics`) gezielt nur für aktive Profiling-Phasen aktivieren.

## 5) Sicherheits-/Betriebshinweis zu EPG-URL-Logging

**Beobachtung**
- Die EPG-URL wird inklusive `username`/`password` geloggt.

**Risiko**
- Zugangsdaten landen im Dev-Log, CI-Log oder Crash-Export.

**Vorschlag zur Lösung**
1. URL vor dem Logging maskieren (z. B. `password=***`).
2. Sensible Query-Parameter nie im Klartext loggen.

## Konkreter 7-Tage-Plan (Quick Wins zuerst)

1. **Tag 1–2**: EPG-Dedupe-Lock + URL-Masking implementieren.
2. **Tag 2–3**: Doppelte EPG-Trigger vereinheitlichen (Context vs. Screen).
3. **Tag 3–5**: `MovieList`/`SeriesList`-Item-Komponenten memoizen, `extraData` verschlanken.
4. **Tag 5–7**: tvOS Focus-Flows testen (Apple TV Remote-Navigation) und Scroll-Hierarchie entschlacken.

## Umsetzungsstatus (Start)

- ✅ **Punkt 1 gestartet/umgesetzt:** EPG-Dedupe-Lock (In-Flight-Guard) und URL-Masking in Logs wurden im `IPTVContext` implementiert.
- ✅ **Punkt 1 erweitert:** Zusätzlich wurde ein kurzer Cooldown für schnelle doppelte EPG-Trigger ergänzt, um Burst-Reloads weiter zu reduzieren.
- ✅ **Punkt 2 umgesetzt:** EPG-Triggerquellen wurden vereinheitlicht. Initialer EPG-Load läuft jetzt zentral über `loadProfile`, der zusätzliche `loadEPG`-Trigger in `ChannelList` wurde entfernt.
- ✅ **Punkt 3 umgesetzt:** `extraData` für `MovieList`/`SeriesList` wurde reduziert/stabilisiert und Poster-Zellen wurden per `React.memo` mit Custom-Comparator memoisiert.
- ✅ **Punkt 4 umgesetzt:** In `EpgTimeline` wurde ein nicht-interaktiver Header-`ScrollView` entfernt, die Header-Synchronisierung auf `Animated.View` umgestellt, Renderer/`extraData` stabilisiert, channel->program/favorite Zuordnung vorab memoisiert, die vertikale Sync per `requestAnimationFrame` gedrosselt und nicht-klickbare Program-Blocks aus der TV-Focus-Navigation genommen.
- 🔭 **Nächster Fokus:** Monitoring unter realen tvOS-Sessions (Long-Run), um verbleibende systemseitige `focusItemsInRect`-Warnungen von echten App-Hotspots zu trennen.

## Erwarteter Effekt

- Weniger doppelte EPG-Ladevorgänge.
- Kürzere UI-Stalls beim Laden großer EPG-Dateien.
- Stabilere Focus-Navigation auf tvOS.
- Deutlich weniger `VirtualizedList`-Performance-Warnungen.
