# v0.1.3 Launch Fix

The previous build created its BrowserWindow with `show: false` and relied solely on
Electron's `ready-to-show` event. If the renderer failed before that event, Electron
continued running but no application window appeared.

This build:

- Shows the application shell immediately.
- Focuses the window after the interface finishes loading.
- Shows a visible error dialog if the HTML interface fails to load.
- Shows a visible error dialog if the renderer process stops.
- Includes a 2.5-second fallback that forces the window visible.
- Keeps launch errors in the command window instead of silently disappearing.
- Updates Electron from the older 37 branch to the current stable 43 branch.
- Explicitly approves Electron's required package installation script.
