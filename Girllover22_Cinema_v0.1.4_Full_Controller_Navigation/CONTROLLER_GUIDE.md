# Girllover22 Cinema Controller Guide — v0.1.4

Controller navigation now covers the entire application.

## Navigation zones

- Sidebar
- Search, sorting and scan controls
- Search filter chips
- Hero Play and Information buttons
- Every media row and media card
- Settings and details windows
- Full player

## Controls

- D-pad / left stick: move
- A: open, activate, or play/pause
- B: close or return
- X: information for selected media
- Y: jump to Search
- LB/RB: page movement; seek ±10 seconds in the player
- Menu/Start: Settings

Moving right from the sidebar enters the content. Moving left from the first card returns
to the sidebar. Up/down preserves the nearest column across rows. Focused cards centre
themselves in their horizontal row.

The uploaded Pygame sample was used as a behavioural reference for dead-zone, hot-plug,
and repeat timing; its Python code is not embedded in the Electron application.
