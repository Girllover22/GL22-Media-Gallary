/**
 * GamepadController - Unified gamepad/controller API
 * Handles Xbox, PlayStation, and generic gamepads
 * Emits events for button presses, analog stick, and D-pad
 */

class GamepadController {
  constructor(options = {}) {
    this.padIndex = null;
    this.connected = false;
    this.lastButtonState = [];
    this.lastAxisState = [];
    this.listeners = {};

    // Configuration
    this.config = {
      deadzone: options.deadzone || 0.15,
      repeatDelay: options.repeatDelay || 100,
      repeatInitialDelay: options.repeatInitialDelay || 300,
      ...options,
    };

    // Repeat state
    this.repeatKeys = new Map();
    this.heldAxis = null;
    this.lastRepeatTime = 0;

    // Standard gamepad button mapping
    this.buttons = {
      A: 0,
      B: 1,
      X: 2,
      Y: 3,
      LB: 4,
      RB: 5,
      LT: 6,
      RT: 7,
      BACK: 8,
      START: 9,
      L_STICK: 10,
      R_STICK: 11,
      UP: 12,
      DOWN: 13,
      LEFT: 14,
      RIGHT: 15,
    };

    // Standard gamepad axis mapping
    this.axes = {
      L_STICK_X: 0,
      L_STICK_Y: 1,
      R_STICK_X: 2,
      R_STICK_Y: 3,
    };

    // Button names for debug
    this.buttonNames = {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LB',
      5: 'RB',
      6: 'LT',
      7: 'RT',
      8: 'Back',
      9: 'Start',
      10: 'L-Stick',
      11: 'R-Stick',
      12: 'D-Pad Up',
      13: 'D-Pad Down',
      14: 'D-Pad Left',
      15: 'D-Pad Right',
    };

    this.init();
  }

  init() {
    // Prime the Gamepad API by calling it immediately
    if (navigator.getGamepads) {
      navigator.getGamepads();
    }

    // Listen for connection events
    window.addEventListener('gamepadconnected', (e) => this.onConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onDisconnect(e));

    // Start polling
    this.startPolling();

    // Try to connect if a gamepad is already plugged in
    setTimeout(() => this.tryConnect(), 100);
  }

  tryConnect() {
    try {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const pad = pads.find((p) => p !== null && p !== undefined);
      if (pad && !this.connected) {
        this.padIndex = pad.index;
        this.connected = true;
        this.lastButtonState = new Array(pad.buttons.length).fill(false);
        this.lastAxisState = new Array(pad.axes.length).fill(0);
        this.emit('connect', { id: pad.id, index: pad.index });
      }
    } catch (e) {
      console.error('[GamepadController] Error during connection attempt:', e);
    }
  }

  onConnect(e) {
    this.padIndex = e.gamepad.index;
    this.connected = true;
    this.lastButtonState = e.gamepad.buttons.map((b) => b.pressed);
    this.lastAxisState = [...e.gamepad.axes];
    this.emit('connect', { id: e.gamepad.id, index: e.gamepad.index });
    console.log(`[GamepadController] Connected: ${e.gamepad.id}`);
  }

  onDisconnect(e) {
    if (this.padIndex === e.gamepad.index) {
      this.padIndex = null;
      this.connected = false;
      this.repeatKeys.clear();
      this.emit('disconnect', { index: e.gamepad.index });
      console.log('[GamepadController] Disconnected');
    }
  }

  startPolling() {
    const poll = () => {
      this.update();
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  update() {
    if (!this.connected || this.padIndex === null) {
      // Try to reconnect
      this.tryConnect();
      return;
    }

    let pad;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      pad = pads[this.padIndex];
    } catch (e) {
      return;
    }

    if (!pad) {
      return;
    }

    this.updateButtons(pad);
    this.updateAxes(pad);
  }

  updateButtons(pad) {
    for (let i = 0; i < pad.buttons.length; i++) {
      const pressed = pad.buttons[i].pressed;
      const wasPressed = this.lastButtonState[i];

      // Button press (transition from not pressed to pressed)
      if (pressed && !wasPressed) {
        this.emit('buttondown', {
          button: i,
          name: this.buttonNames[i],
        });
      }
      // Button release
      else if (!pressed && wasPressed) {
        this.emit('buttonup', {
          button: i,
          name: this.buttonNames[i],
        });
      }
    }
    this.lastButtonState = pad.buttons.map((b) => b.pressed);
  }

  updateAxes(pad) {
    // Check left stick
    const lx = pad.axes[0] || 0;
    const ly = pad.axes[1] || 0;
    const rx = pad.axes[2] || 0;
    const ry = pad.axes[3] || 0;

    // Deadzone
    const lxDead = Math.abs(lx) > this.config.deadzone ? lx : 0;
    const lyDead = Math.abs(ly) > this.config.deadzone ? ly : 0;
    const rxDead = Math.abs(rx) > this.config.deadzone ? rx : 0;
    const ryDead = Math.abs(ry) > this.config.deadzone ? ry : 0;

    // Emit axis changes
    if (lxDead !== 0 || lyDead !== 0) {
      this.emit('leftstick', {
        x: lxDead,
        y: lyDead,
        magnitude: Math.sqrt(lxDead ** 2 + lyDead ** 2),
      });
    }

    if (rxDead !== 0 || ryDead !== 0) {
      this.emit('rightstick', {
        x: rxDead,
        y: ryDead,
        magnitude: Math.sqrt(rxDead ** 2 + ryDead ** 2),
      });
    }

    // Store for next frame
    this.lastAxisState = [lxDead, lyDead, rxDead, ryDead];
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  // Convenience methods for button queries
  isButtonPressed(buttonId) {
    if (!this.connected || this.padIndex === null) return false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.padIndex];
    return pad && pad.buttons[buttonId] && pad.buttons[buttonId].pressed;
  }

  getLeftStick() {
    if (!this.connected || this.padIndex === null) return { x: 0, y: 0 };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.padIndex];
    if (!pad) return { x: 0, y: 0 };
    const x = Math.abs(pad.axes[0]) > this.config.deadzone ? pad.axes[0] : 0;
    const y = Math.abs(pad.axes[1]) > this.config.deadzone ? pad.axes[1] : 0;
    return { x, y };
  }

  getRightStick() {
    if (!this.connected || this.padIndex === null) return { x: 0, y: 0 };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.padIndex];
    if (!pad) return { x: 0, y: 0 };
    const x = Math.abs(pad.axes[2]) > this.config.deadzone ? pad.axes[2] : 0;
    const y = Math.abs(pad.axes[3]) > this.config.deadzone ? pad.axes[3] : 0;
    return { x, y };
  }

  vibrate(duration = 100, strongMagnitude = 1, weakMagnitude = 0.5) {
    if (!this.connected || this.padIndex === null) return false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.padIndex];

    if (pad && pad.vibrationActuator) {
      pad.vibrationActuator
        .playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          strongMagnitude,
          weakMagnitude,
        })
        .catch(() => {});
      return true;
    }
    return false;
  }

  destroy() {
    this.connected = false;
    this.listeners = {};
  }
}

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamepadController;
} else if (typeof window !== 'undefined') {
  window.GamepadController = GamepadController;
}
