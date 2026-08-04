/**
 * MediaPlayer - Standalone HTML5 media player with controller support
 * Supports video and audio with keyboard/gamepad controls
 * No dependencies required
 */

class MediaPlayer {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`Container not found: ${containerSelector}`);
    }

    this.options = {
      autoplay: options.autoplay || false,
      muted: options.muted !== false,
      loop: options.loop || false,
      controls: options.controls !== false,
      preload: options.preload || 'metadata',
      ...options,
    };

    this.currentFile = null;
    this.isPlaying = false;
    this.volume = 1;
    this.playbackRate = 1;
    this.playlist = [];
    this.currentIndex = -1;
    this.isSeeking = false;

    this.listeners = [];

    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="media-player">
        <video class="media-player__video" 
          preload="${this.options.preload}"
          ${this.options.autoplay ? 'autoplay' : ''}
          ${this.options.muted ? 'muted' : ''}
          ${this.options.loop ? 'loop' : ''}
          ${this.options.controls ? 'controls' : ''}
          playsinline>
        </video>
        <div class="media-player__info">
          <div class="media-player__title"></div>
          <div class="media-player__time">
            <span class="media-player__current-time">0:00</span>
            <span class="media-player__duration">0:00</span>
          </div>
          <div class="media-player__progress">
            <div class="media-player__progress-bar"></div>
          </div>
        </div>
      </div>
    `;

    this.video = this.container.querySelector('.media-player__video');
    this.titleEl = this.container.querySelector('.media-player__title');
    this.currentTimeEl = this.container.querySelector('.media-player__current-time');
    this.durationEl = this.container.querySelector('.media-player__duration');
    this.progressBar = this.container.querySelector('.media-player__progress-bar');
  }

  attachEventListeners() {
    this.video.addEventListener('play', () => this.onPlay());
    this.video.addEventListener('pause', () => this.onPause());
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('durationchange', () => this.onDurationChange());
    this.video.addEventListener('seeking', () => (this.isSeeking = true));
    this.video.addEventListener('seeked', () => (this.isSeeking = false));
    this.video.addEventListener('ended', () => this.onEnded());
    this.video.addEventListener('error', (e) => this.onError(e));

    // Progress bar click
    if (this.progressBar) {
      this.progressBar.addEventListener('click', (e) => this.seek(e));
    }
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

  async load(file) {
    if (typeof file === 'string') {
      this.currentFile = { url: file, name: file.split('/').pop() };
    } else {
      this.currentFile = file;
    }

    this.video.src = this.currentFile.url;
    if (this.titleEl) {
      this.titleEl.textContent = this.currentFile.name || 'Media';
    }
    this.emit('load', this.currentFile);
  }

  play() {
    if (!this.currentFile) return;
    this.video.play().catch((err) => this.onError(err));
  }

  pause() {
    this.video.pause();
  }

  togglePlayPause() {
    this.isPlaying ? this.pause() : this.play();
  }

  seek(timeOrEvent) {
    let time;
    if (typeof timeOrEvent === 'number') {
      time = timeOrEvent;
    } else if (timeOrEvent instanceof MouseEvent) {
      const rect = this.progressBar.getBoundingClientRect();
      const x = timeOrEvent.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      time = percent * (this.video.duration || 0);
    } else {
      return;
    }
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration || Infinity));
  }

  skipForward(seconds = 10) {
    this.seek(this.video.currentTime + seconds);
  }

  skipBackward(seconds = 10) {
    this.seek(this.video.currentTime - seconds);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.video.volume = this.volume;
    this.emit('volumechange', this.volume);
  }

  changeVolume(delta) {
    this.setVolume(this.volume + delta);
  }

  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.25, Math.min(2, rate));
    this.video.playbackRate = this.playbackRate;
    this.emit('ratechange', this.playbackRate);
  }

  addToPlaylist(file) {
    this.playlist.push(file);
  }

  loadPlaylist(files) {
    this.playlist = Array.isArray(files) ? files : [files];
  }

  playNext() {
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex++;
      this.load(this.playlist[this.currentIndex]);
      this.play();
    }
  }

  playPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.load(this.playlist[this.currentIndex]);
      this.play();
    }
  }

  formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  onPlay() {
    this.isPlaying = true;
    this.emit('play', null);
  }

  onPause() {
    this.isPlaying = false;
    this.emit('pause', null);
  }

  onTimeUpdate() {
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
    }
    if (this.progressBar && this.video.duration) {
      const percent = (this.video.currentTime / this.video.duration) * 100;
      this.progressBar.style.width = `${percent}%`;
    }
    this.emit('timeupdate', this.video.currentTime);
  }

  onDurationChange() {
    if (this.durationEl) {
      this.durationEl.textContent = this.formatTime(this.video.duration);
    }
    this.emit('durationchange', this.video.duration);
  }

  onEnded() {
    this.isPlaying = false;
    if (this.currentIndex < this.playlist.length - 1) {
      this.playNext();
    }
    this.emit('ended', null);
  }

  onError(error) {
    console.error('[MediaPlayer] Error:', error);
    this.emit('error', error);
  }

  destroy() {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.load();
    }
    this.container.innerHTML = '';
    this.listeners = {};
  }
}

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediaPlayer;
} else if (typeof window !== 'undefined') {
  window.MediaPlayer = MediaPlayer;
}
