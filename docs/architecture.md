# Architecture

## Overview
CouchPotatoPlayer is structured around separation of concerns:
- UI rendering
- playback logic
- data fetching / integrations
- shared state
- utilities

## Principles
- Keep UI focused on presentation
- Isolate playback logic
- Centralize API and persistence
- Avoid duplication

## Risk areas
- playback lifecycle
- async state sync
- navigation side effects
- large lists

## Performance notes
- avoid unnecessary rerenders
- avoid repeated heavy computations
- avoid duplicate network calls


## Platform UI shell strategy
- TV platforms (tvOS, Android TV) use a TV-first shell with a persistent left navigation rail and a dedicated content header area.
- TV Live section uses a split-pane content area (categories, channel list, focused channel preview) to keep browse context visible during remote navigation.
- TV Movies/Series sections use split panes (categories + poster grid + focused-item summary panel) while mobile keeps compact tab-driven touch layouts.
- Mobile platforms (iOS, iPadOS, Android) keep the existing tab-based top navigation pattern for touch-first interaction.
- Both shells reuse the same data and playback flows to avoid divergence in core behavior.
