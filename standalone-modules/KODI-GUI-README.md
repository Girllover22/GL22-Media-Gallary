# Kodi-like Media Center GUI

Production-ready Kodi-style media library interface with full gamepad/controller support.

## Features

✅ **Kodi-style UI**
- Card-based media grid
- Responsive design
- Dark theme with neon accents
- Smooth animations

✅ **Full Controller Support**
- D-pad navigation
- Button mapping (A/B/LB/RB)
- Analog stick support
- Auto-focus with visual feedback

✅ **Media Management**
- Filter by type (all, videos, pictures)
- Real-time search
- Sort by name, date, or size
- Grouped browsing

✅ **Media Preview**
- Hover preview panel
- Image thumbnails
- Video metadata
- File information

✅ **Integration**
- Works with MediaLibrary for file management
- Works with GamepadController for input
- Works with MediaPlayer for playback
- Compatible with Electron and browser

## Files Included

- `media-library.js` - File management and filtering
- `kodi-gui.js` - UI component
- `kodi-gui.css` - Complete styling
- `gamepad-controller.js` - Input handling
- `media-player.js` - Media playback
- `kodi-example.html` - Complete working example

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="kodi-gui.css">
</head>
<body>
  <div id="media-center"></div>

  <script src="media-library.js"></script>
  <script src="gamepad-controller.js"></script>
  <script src="kodi-gui.js"></script>
  <script>
    const library = new MediaLibrary();
    const gui = new KodiGUI('#media-center', { library });
    const gamepad = new GamepadController();

    await library.loadFromElectron();

    gui.on('select', ({ file }) => {
      console.log('Playing:', file.name);
    });
  </script>
</body>
</html>
```

## Gamepad Controls

**In Library View:**
- D-Pad / Left Stick - Navigate cards
- A - Select and play
- LB / RB - Previous/Next
- Start - Focus search

**In Video Player:**
- A - Play/Pause
- B - Close player
- LB - Previous video
- RB - Next video

## Keyboard Controls

- Arrow Keys - Navigate
- Enter - Select
- Escape - Close

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Grid Layout | ✅ | ✅ | ✅ | ✅ |
| Media Files | ✅ | ✅ | ✅ | ✅ |
| Gamepad API | ✅ | ✅ | ❌ | ✅ |

## License

MIT