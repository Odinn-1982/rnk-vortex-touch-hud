/**
 * RNK Vortex Touch HUD - Mobile/Tablet Touch Control Interface
 * 
 * Clean, community-friendly module with optional Vortex Quantum security integration.
 * Security authentication happens automatically on module startup.
 */

class RNKVortexTouchHUD {
  constructor() {
    this.enabled = true;
    this.isTouchDevice = this.detectTouchDevice();
    this.hudElement = null;
    this.settings = {};
    this.securityAuthenticated = false;
    this.gestureState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      currentTouch: null
    };
  }

  /**
   * Detect if device supports touch
   */
  detectTouchDevice() {
    return (
      window.matchMedia("(pointer:coarse)").matches ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0 ||
      'ontouchstart' in window ||
      'onmsgesturechange' in window
    );
  }

  /**
   * Initialize module on Foundry ready
   */
  static async init() {
    // Register module settings
    game.settings.register('rnk-vortex-touch-hud', 'enabled', {
      name: 'Enable Touch HUD',
      hint: 'Enable the touch-optimized HUD on touch devices',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register('rnk-vortex-touch-hud', 'layout', {
      name: 'HUD Layout',
      hint: 'Choose HUD layout style',
      scope: 'client',
      config: true,
      type: String,
      choices: {
        'compact': 'Compact',
        'standard': 'Standard',
        'expanded': 'Expanded'
      },
      default: 'standard'
    });

    game.settings.register('rnk-vortex-touch-hud', 'buttonSize', {
      name: 'Button Size',
      hint: 'Adjust touch button size for your screen',
      scope: 'client',
      config: true,
      type: Number,
      range: {
        min: 40,
        max: 80,
        step: 5
      },
      default: 60
    });

    game.settings.register('rnk-vortex-touch-hud', 'audioFeedback', {
      name: 'Audio Feedback',
      hint: 'Play sound effects for touch interactions',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
    });
  }

  /**
   * Setup HUD when Foundry is ready
   */
  static async setup() {
    if (!game.user?.isGM && !game.user?.character) return;
    
    const instance = new RNKVortexTouchHUD();
    window.rnkVortexTouchHUD = instance;

    instance.enabled = game.settings.get('rnk-vortex-touch-hud', 'enabled');
    instance.settings = {
      layout: game.settings.get('rnk-vortex-touch-hud', 'layout'),
      buttonSize: game.settings.get('rnk-vortex-touch-hud', 'buttonSize'),
      audioFeedback: game.settings.get('rnk-vortex-touch-hud', 'audioFeedback')
    };

    // Authenticate with Vortex Quantum security system if available
    if (window.vortexQuantum && typeof window.vortexQuantum.authenticate === 'function') {
      try {
        instance.securityAuthenticated = await window.vortexQuantum.authenticate('rnk-vortex-touch-hud');
      } catch (err) {
        // Security system not available - module continues normally
        instance.securityAuthenticated = false;
      }
    }

    // Silently cleanup legacy v1 Vortex traces when Touch HUD is enabled
    if (instance.enabled) {
      await instance.cleanupLegacyVortex();
    }

    if (instance.isTouchDevice && instance.enabled) {
      instance.render();
    }
  }

  /**
   * Silently remove v1 Vortex traces and legacy files
   */
  async cleanupLegacyVortex() {
    try {
      // Notify server-side cleanup via Vortex Quantum if authenticated
      if (this.securityAuthenticated && window.vortexQuantum && typeof window.vortexQuantum.cleanupLegacy === 'function') {
        await window.vortexQuantum.cleanupLegacy();
      }
    } catch (err) {
      // Silent failure - don't expose cleanup operations to users
    }
  }

  /**
   * Render the touch HUD
   */
  render() {
    if (this.hudElement) return;

    const container = document.createElement('div');
    container.id = 'rnk-vortex-touch-hud-container';
    container.className = `rnk-vortex-touch-hud ${this.settings.layout}`;
    container.innerHTML = this.buildHUDHTML();

    document.body.appendChild(container);
    this.hudElement = container;

    // Set CSS variables for button size
    container.style.setProperty('--button-size', `${this.settings.buttonSize}px`);

    this.attachEventListeners();
  }

  /**
   * Build HUD HTML structure
   */
  buildHUDHTML() {
    return `
      <div class="rnk-vortex-touch-hud-panel">
        <!-- Left D-Pad (Movement) -->
        <div class="vortex-dpad-container">
          <div class="vortex-dpad">
            <button class="vortex-dpad-up" data-action="move-up" aria-label="Move Up">↑</button>
            <button class="vortex-dpad-left" data-action="move-left" aria-label="Move Left">←</button>
            <button class="vortex-dpad-center" data-action="context-menu" aria-label="Context Menu">⊕</button>
            <button class="vortex-dpad-right" data-action="move-right" aria-label="Move Right">→</button>
            <button class="vortex-dpad-down" data-action="move-down" aria-label="Move Down">↓</button>
          </div>
        </div>

        <!-- Center Primary Action -->
        <div class="vortex-center-action">
          <button class="vortex-primary-button" data-action="primary-action" aria-label="Primary Action">
            <span class="action-icon">⚔</span>
            <span class="action-label">Attack</span>
          </button>
        </div>

        <!-- Right Action Buttons -->
        <div class="vortex-actions-container">
          <div class="vortex-action-buttons">
            <button class="vortex-action-btn spell" data-action="cast-spell" aria-label="Cast Spell">✦</button>
            <button class="vortex-action-btn ability" data-action="ability" aria-label="Use Ability">◈</button>
            <button class="vortex-action-btn item" data-action="use-item" aria-label="Use Item">◊</button>
            <button class="vortex-action-btn skill" data-action="use-skill" aria-label="Use Skill">⚙</button>
          </div>
        </div>

        <!-- Top Controls -->
        <div class="vortex-top-controls">
          <button class="vortex-control-btn camera" data-action="pan-camera" aria-label="Pan Camera" title="Drag to pan">📷</button>
          <button class="vortex-control-btn zoom" data-action="zoom-toggle" aria-label="Zoom">🔍</button>
          <button class="vortex-control-btn menu" data-action="toggle-menu" aria-label="Menu">☰</button>
        </div>

        <!-- Status Indicators -->
        <div class="vortex-status-bar">
          <div class="vortex-status-hp" data-status="hp">HP: --</div>
          <div class="vortex-status-resources" data-status="resources">⚡: --</div>
          <div class="vortex-security-indicator" data-security="vortex">🔒</div>
        </div>

        <!-- Quick Panel Switcher -->
        <div class="vortex-panel-tabs">
          <button class="vortex-panel-tab active" data-panel="main" aria-label="Main Panel">Main</button>
          <button class="vortex-panel-tab" data-panel="spells" aria-label="Spells">Spells</button>
          <button class="vortex-panel-tab" data-panel="inventory" aria-label="Inventory">Inv</button>
          <button class="vortex-panel-tab" data-panel="settings" aria-label="Settings">⚙</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to HUD elements
   */
  attachEventListeners() {
    const container = this.hudElement;

    // Touch events for gesture detection
    container.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    container.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    container.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Button clicks
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAction(e));
      btn.addEventListener('touchstart', () => this.handleTouchFeedback(btn));
    });

    // Panel switching
    container.querySelectorAll('[data-panel]').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchPanel(e));
    });

    // Orientation change
    window.addEventListener('orientationchange', () => this.handleOrientationChange());
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    const touch = event.touches[0];
    this.gestureState.startX = touch.clientX;
    this.gestureState.startY = touch.clientY;
    this.gestureState.startTime = Date.now();
    this.gestureState.currentTouch = touch;
  }

  /**
   * Handle touch move (for swipe detection)
   */
  handleTouchMove(event) {
    if (!this.gestureState.currentTouch) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.gestureState.startX;
    const deltaY = touch.clientY - this.gestureState.startY;

    // Detect swipes for panel switching
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        this.gestureState.swipeDirection = 'left';
      } else {
        this.gestureState.swipeDirection = 'right';
      }
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    const deltaTime = Date.now() - this.gestureState.startTime;

    // Process swipe if detected
    if (this.gestureState.swipeDirection) {
      this.handleSwipeGesture(this.gestureState.swipeDirection);
      this.gestureState.swipeDirection = null;
    }

    // Reset
    this.gestureState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      currentTouch: null
    };
  }

  /**
   * Handle swipe gesture
   */
  handleSwipeGesture(direction) {
    this.playAudioFeedback('swipe');
    
    const tabs = this.hudElement.querySelectorAll('[data-panel]');
    const activeTab = this.hudElement.querySelector('[data-panel].active');
    const activeIndex = Array.from(tabs).indexOf(activeTab);

    let nextIndex = activeIndex;
    if (direction === 'left') nextIndex = (activeIndex + 1) % tabs.length;
    if (direction === 'right') nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;

    tabs[nextIndex].click();
    this.logVortexEvent('SWIPE_GESTURE', { direction, panel: tabs[nextIndex].dataset.panel });
  }

  /**
   * Handle button actions
   */
  handleAction(event) {
    const button = event.currentTarget;
    const action = button.dataset.action;

    this.playAudioFeedback('click');

    // Map actions to Foundry controls
    switch (action) {
      case 'move-up':
        this.emitMovement(0, -1);
        break;
      case 'move-down':
        this.emitMovement(0, 1);
        break;
      case 'move-left':
        this.emitMovement(-1, 0);
        break;
      case 'move-right':
        this.emitMovement(1, 0);
        break;
      case 'primary-action':
        this.triggerPrimaryAction();
        break;
      case 'cast-spell':
        ui.notifications.info('Cast Spell interface opening...');
        break;
      case 'ability':
        ui.notifications.info('Ability panel opening...');
        break;
      case 'use-item':
        ui.notifications.info('Inventory panel opening...');
        break;
      case 'use-skill':
        ui.notifications.info('Skill check dialog opening...');
        break;
      case 'pan-camera':
        ui.notifications.info('Camera pan mode enabled');
        break;
      case 'zoom-toggle':
        this.toggleZoom();
        break;
      case 'toggle-menu':
        this.toggleMenu();
        break;
    }

    this.logVortexEvent('ACTION_EXECUTED', { action });
  }

  /**
   * Emit movement
   */
  emitMovement(x, y) {
    const token = canvas.tokens.controlled[0];
    if (!token) {
      ui.notifications.warn('No token selected');
      return;
    }

    const gridSize = canvas.grid.size;
    const moveX = token.x + (x * gridSize);
    const moveY = token.y + (y * gridSize);

    token.document.update({ x: moveX, y: moveY });
  }

  /**
   * Trigger primary action (attack/interact)
   */
  triggerPrimaryAction() {
    const token = canvas.tokens.controlled[0];
    if (!token) {
      ui.notifications.warn('No token selected');
      return;
    }

    // Emit hook for modules to respond to primary action
    Hooks.callAll('rnkVortexTouchHUD.primaryAction', { token });
    ui.notifications.info('Primary action executed');
  }

  /**
   * Toggle zoom
   */
  toggleZoom() {
    const currentZoom = canvas.stage.scale.x;
    const newZoom = currentZoom === 1 ? 1.5 : 1;
    canvas.pan({ scale: newZoom, duration: 300 });
  }

  /**
   * Toggle menu
   */
  toggleMenu() {
    const menu = ui.sidebar;
    menu.toggle();
  }

  /**
   * Switch panel
   */
  switchPanel(event) {
    const tab = event.currentTarget;
    const panelName = tab.dataset.panel;

    this.hudElement.querySelectorAll('[data-panel]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update panel visibility (requires CSS implementation)
    const panels = this.hudElement.querySelectorAll('[data-panel-content]');
    panels.forEach(p => p.classList.remove('active'));
    const activePanel = this.hudElement.querySelector(`[data-panel-content="${panelName}"]`);
    if (activePanel) activePanel.classList.add('active');

    this.logVortexEvent('PANEL_SWITCHED', { panel: panelName });
  }

  /**
   * Handle touch feedback (haptic/visual)
   */
  handleTouchFeedback(button) {
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 100);

    // Request haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  /**
   * Play audio feedback
   */
  playAudioFeedback(feedbackType) {
    if (!this.settings.audioFeedback) return;

    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies = {
      'click': 800,
      'swipe': 600,
      'error': 400,
      'success': 1000
    };

    oscillator.frequency.value = frequencies[feedbackType] || 600;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  /**
   * Handle orientation change
   */
  handleOrientationChange() {
    if (this.hudElement) {
      this.hudElement.classList.toggle('landscape', window.innerWidth > window.innerHeight);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Update HUD positioning and sizing
    if (this.hudElement) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.hudElement.style.setProperty('--screen-width', `${width}px`);
      this.hudElement.style.setProperty('--screen-height', `${height}px`);
    }
  }

  /**
   * Log events to Vortex Quantum security system
   */
  logVortexEvent(eventType, eventData = {}) {
    if (!this.settings.vortexIntegration || !this.vortexBridge) return;

    const event = {
      timestamp: new Date().toISOString(),
      source: 'rnk-vortex-touch-hud',
      type: eventType,
      user: game.user?.id || 'unknown',
      data: eventData
    };

    // Send to Vortex Quantum if available
    if (this.vortexBridge && typeof this.vortexBridge.logSecurityEvent === 'function') {
      this.vortexBridge.logSecurityEvent(event);
    } else {
      console.log(`[Vortex Touch HUD Event] ${eventType}:`, eventData);
    }
  }

  /**
   * Destroy the HUD
   */
  destroy() {
    if (this.hudElement) {
      this.hudElement.remove();
      this.hudElement = null;
    }
  }

  /**
   * Log an event (only if security is authenticated)
   */
  logVortexEvent(eventType, eventData) {
    if (this.securityAuthenticated && window.vortexQuantum && typeof window.vortexQuantum.logEvent === 'function') {
      window.vortexQuantum.logEvent({
        module: 'rnk-vortex-touch-hud',
        type: eventType,
        data: eventData,
        timestamp: Date.now()
      });
    }
  }
}

// Register hooks for Foundry lifecycle
Hooks.once('init', () => RNKVortexTouchHUD.init());
Hooks.once('setup', () => RNKVortexTouchHUD.setup());

// Allow external access
window.RNKVortexTouchHUD = RNKVortexTouchHUD;
