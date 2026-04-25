# Branding & Store-Grafiken

Die Store-Assets basieren auf dem CouchPotato-Logo und werden per Script erzeugt.

## Quellen

- `assets/icon.png` → Brand-Marke (ohne Wortmarke)
- `assets/splash.png` → Logo mit Wortmarke

## Generierte Dateien

Script: `python3 scripts/generate_brand_assets.py`

Das Script erzeugt ein ZIP, das bereits die **korrekten Projektpfade** enthält.
Wenn du das ZIP im Projekt-Root entpackst, stimmen Dateinamen und Pfade direkt mit dem Code überein.

### iOS Store

- `build/asset-package/assets/store/ios/app-store-icon-1024.png` (1024×1024)

### tvOS Store / Top Shelf

- `build/asset-package/assets/store/tvos/app-icon-small-400x240.png`
- `build/asset-package/assets/store/tvos/app-icon-small2x-800x480.png`
- `build/asset-package/assets/store/tvos/app-icon-large-1280x768.png`
- `build/asset-package/assets/store/tvos/top-shelf-1920x720.png`
- `build/asset-package/assets/store/tvos/top-shelf-wide-2320x720.png`

### ZIP-Bundle

- `build/CouchPotatoPlayer-assets.zip`

### Inhalt im ZIP (Pfade für direktes Entpacken ins Repo)

- `assets/brand-mark.png`
- `assets/brand-wordmark.png`
- `assets/store/ios/app-store-icon-1024.png`
- `assets/store/tvos/app-icon-small-400x240.png`
- `assets/store/tvos/app-icon-small2x-800x480.png`
- `assets/store/tvos/app-icon-large-1280x768.png`
- `assets/store/tvos/top-shelf-1920x720.png`
- `assets/store/tvos/top-shelf-wide-2320x720.png`
- `ios/CouchPotatoPlayer/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`

## Konfiguration

- Splash-Hintergrund wurde auf das helle Marken-Grau `#E4E4E7` angepasst.
- tvOS-App-Icons nutzen die Couch-Kartoffel-Player-Marke ohne blaue Kachel auf weißem Hintergrund.
- tvOS-Top-Shelf-Banner werden aus `assets/store/tvos/app-icon-large-1280x768.png` per `swift scripts/generate_tvos_top_shelf.swift` abgeleitet.
- In-App-Branding nutzt `assets/brand-mark.png` und `assets/brand-wordmark.png`.
