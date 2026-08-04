# Standalone Media & Controller Modules

Production-ready, framework-independent JavaScript modules for building media players with gamepad/controller support.

## Modules

### 1. **MediaPlayer** (`media-player.js`)

HTML5 video/audio player with events and controls.

#### Features
- ✅ HTML5 `<video>` element wrapper
- ✅ Play, pause, seek, skip, volume, playback rate
- ✅ Playlist support
- ✅ Event system (play, pause, ended, timeupdate, etc.)
- ✅ Time formatting and progress tracking
- ✅ No dependencies

#### Usage

```javascript
const player = new MediaPlayer('#player-container', {
  autoplay: false,
  muted: false,
  controls: true,
});

// Load media
await player.load({
  url: '/path/to/video.mp4',
  name: 'My Video'
});

// Control playback
player.play();
player.pause();
player.seekForward(10);
player.setVolume(0.5);
player.setPlaybackRate(1.5);

// Listen to events
player.on('play', () => console.log('Playing!'));
player.on('timeupdate', (time) => console.log('Time:', time));
player.on('ended', () => console.log('Finished'));

// Playlist
player.loadPlaylist([...files]);
player.playNext();
player.playPrevious();
```

### 2. **GamepadController** (`gamepad-controller.js`)

Unified gamepad API handler with event-driven input.

#### Features
- ✅ Xbox, PlayStation, generic gamepad support
- ✅ D-pad and analog stick input
- ✅ Button press/release events
- ✅ Configurable deadzone
- ✅ Auto-reconnection
- ✅ Vibration support
- ✅ No dependencies

#### Usage

```javascript
const gamepad = new GamepadController({
  deadzone: 0.15,
  repeatDelay: 100,
});

// Listen to events
gamepad.on('connect', (data) => {
  console.log('Connected:', data.id);
});

gamepad.on('buttondown', (data) => {
  console.log('Button pressed:', data.name); // 'A', 'B', 'X', 'Y', etc.
});

gamepad.on('leftstick', (data) => {
  console.log('Stick moved:', data.x, data.y);
});

gamepad.on('rightstick', (data) => {
  console.log('Right stick:', data.x, data.y);
});

// Query state
if (gamepad.connected) {
  const stick = gamepad.getLeftStick();
  console.log('Stick:', stick.x, stick.y);
}

// Vibration
gamepad.vibrate(100, 1.0, 0.5);

// Button constants
console.log(gamepad.buttons.A);     // 0
console.log(gamepad.buttons.B);     // 1
console.log(gamepad.buttons.START); // 9
```

**Button Mapping (Standard Gamepad)**

```
Buttons:           Axes:
0  = A             0 = Left Stick X
1  = B             1 = Left Stick Y
2  = X             2 = Right Stick X
3  = Y             3 = Right Stick Y
4  = LB
5  = RB
6  = LT
7  = RT
8  = Back
9  = Start
10 = L-Stick Click
11 = R-Stick Click
12-15 = D-Pad (Up, Down, Left, Right)
```

### 3. **NavigatorHelper** (`navigator-helper.js`)

Keyboard and controller-based UI navigation.

#### Features
- ✅ Focus zone management
- ✅ Next/previous/directional navigation
- ✅ Element visibility checking
- ✅ Auto-scroll to focused elements
- ✅ Custom focus styling
- ✅ No dependencies

#### Usage

```javascript
const nav = new NavigatorHelper({
  focusClass: 'focused',
  scrollBehavior: 'smooth',
});

// Register zones
nav.registerZone('buttons', '.controls button');
nav.registerZone('menu', '.sidebar a');

// Navigate
nav.move('down');
nav.move('up');
nav.focusNext();
nav.focusPrevious();

// Focus specific zone
nav.focusZone('buttons', 0);

// Activate focused element
nav.activate();

// Get focused element
const current = nav.getFocused();

// Listen to events
nav.on('focus', (data) => {
  console.log('Focused:', data.element);
});
```

## Complete Example

See `example-setup.html` for a full working example with:
- Media player with video controls
- Button controls
- Full gamepad support
- Keyboard navigation
- Live status display

## Integration

### Electron

```javascript
// preload.js
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('mediaAPI', {
  loadFile: (path) => ipcRenderer.invoke('load-file', path),
});
```

```html
<!-- index.html -->
<script src="media-player.js"></script>
<script src="gamepad-controller.js"></script>
<script src="navigator-helper.js"></script>
```

### Web

```html
<script type="module">
  import MediaPlayer from './media-player.js';
  import GamepadController from './gamepad-controller.js';
  
  const player = new MediaPlayer('#player');
  const gamepad = new GamepadController();
</script>
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| HTML5 Video | ✅ | ✅ | ✅ | ✅ |
| Gamepad API | ✅ | ✅ | ❌ | ✅ |
| Vibration | ✅ | ❌ | ❌ | ✅ |

## Performance

- No jQuery or heavy frameworks
- Minimal DOM manipulation
- Efficient event delegation
- RAF-based polling (gamepad updates at 60fps)
- Total size: ~15KB minified

## License

MIT
