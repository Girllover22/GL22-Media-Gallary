/**
 * NavigatorHelper - Keyboard and controller-based navigation UI helper
 * Manages focus zones, tab navigation, and menu traversal
 */

class NavigatorHelper {
  constructor(options = {}) {
    this.config = {
      focusClass: options.focusClass || 'focused',
      focusZoneAttr: options.focusZoneAttr || 'data-focus-zone',
      scrollBehavior: options.scrollBehavior || 'smooth',
      ...options,
    };

    this.currentFocus = null;
    this.focusZones = new Map();
    this.listeners = {};
  }

  // Register a focus zone (group of focusable elements)
  registerZone(zoneName, selector) {
    const elements = document.querySelectorAll(selector);
    this.focusZones.set(zoneName, Array.from(elements));
  }

  // Get all focusable elements in a zone
  getZoneElements(zoneName) {
    return this.focusZones.get(zoneName) || [];
  }

  // Get all focusable elements (generic)
  getAllFocusableElements() {
    return Array.from(
      document.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [data-focusable]'
      )
    ).filter((el) => this.isElementVisible(el));
  }

  // Check if an element is visible
  isElementVisible(el) {
    if (el.offsetParent === null) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  // Focus on an element
  focus(element) {
    if (!element || !this.isElementVisible(element)) return false;

    // Remove focus from previous
    if (this.currentFocus) {
      this.currentFocus.classList.remove(this.config.focusClass);
    }

    this.currentFocus = element;
    element.classList.add(this.config.focusClass);
    element.focus({ preventScroll: true });

    // Scroll into view
    element.scrollIntoView({
      behavior: this.config.scrollBehavior,
      block: 'nearest',
      inline: 'nearest',
    });

    this.emit('focus', { element });
    return true;
  }

  // Move focus in a direction (up, down, left, right)
  move(direction) {
    const all = this.getAllFocusableElements();
    if (!all.length) return false;

    if (!this.currentFocus) {
      return this.focus(all[0]);
    }

    const currentIndex = all.indexOf(this.currentFocus);
    let nextIndex;

    if (direction === 'up' || direction === 'left') {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down' || direction === 'right') {
      nextIndex = Math.min(all.length - 1, currentIndex + 1);
    } else {
      return false;
    }

    return this.focus(all[nextIndex]);
  }

  // Focus next element
  focusNext() {
    return this.move('down');
  }

  // Focus previous element
  focusPrevious() {
    return this.move('up');
  }

  // Activate current focus (click it)
  activate() {
    if (!this.currentFocus) return false;
    if (this.currentFocus instanceof HTMLInputElement) {
      this.currentFocus.focus();
    } else {
      this.currentFocus.click();
    }
    return true;
  }

  // Move to a specific zone
  focusZone(zoneName, index = 0) {
    const elements = this.getZoneElements(zoneName);
    if (!elements.length) return false;
    const target = elements[Math.min(index, elements.length - 1)];
    return this.focus(target);
  }

  // Get currently focused element
  getFocused() {
    return this.currentFocus;
  }

  // Clear focus
  clearFocus() {
    if (this.currentFocus) {
      this.currentFocus.classList.remove(this.config.focusClass);
      this.currentFocus = null;
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  destroy() {
    this.clearFocus();
    this.focusZones.clear();
    this.listeners = {};
  }
}

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigatorHelper;
} else if (typeof window !== 'undefined') {
  window.NavigatorHelper = NavigatorHelper;
}
