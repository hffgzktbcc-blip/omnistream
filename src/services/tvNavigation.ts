// OmniStream Android TV & D-Pad Remote Spatial Navigation Engine
// Handles 10-foot UI focus, arrow navigation, Enter/OK selection, and Back button handling

class TVNavigationService {
  private isTVMode: boolean = false;
  private activeElement: HTMLElement | null = null;
  private initialized: boolean = false;
  private focusRingStyleElement: HTMLStyleElement | null = null;

  constructor() {
    this.isTVMode = localStorage.getItem('omnistream_tv_mode') === 'true';
  }

  /**
   * Initialize TV Navigation listeners
   */
  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.injectTVStyles();
    if (this.isTVMode) {
      document.body.classList.add('tv-mode');
    }

    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('focusin', this.handleFocusIn);
  }

  public cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('focusin', this.handleFocusIn);
    if (this.focusRingStyleElement) {
      this.focusRingStyleElement.remove();
      this.focusRingStyleElement = null;
    }
    this.initialized = false;
  }

  public setTVMode(enabled: boolean) {
    this.isTVMode = enabled;
    localStorage.setItem('omnistream_tv_mode', enabled ? 'true' : 'false');
    if (enabled) {
      document.body.classList.add('tv-mode');
      this.focusFirstInteractiveElement();
    } else {
      document.body.classList.remove('tv-mode');
    }
  }

  public getTVMode(): boolean {
    return this.isTVMode;
  }

  private injectTVStyles() {
    if (this.focusRingStyleElement || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.id = 'omnistream-tv-focus-styles';
    style.innerHTML = `
      /* TV Focus Glow Ring for Android TV D-Pad Remote */
      :focus-visible,
      .tv-mode :focus,
      .tv-focused {
        outline: none !important;
        box-shadow: 0 0 0 3px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.6) !important;
        border-color: #fbbf24 !important;
        transform: scale(1.03) !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease !important;
        z-index: 30 !important;
      }

      /* 10-Foot UI Sizing for TV screens */
      body.tv-mode {
        font-size: 110%;
        user-select: none;
        -webkit-user-select: none;
      }

      body.tv-mode button,
      body.tv-mode [role="button"],
      body.tv-mode a {
        cursor: default;
      }
    `;
    document.head.appendChild(style);
    this.focusRingStyleElement = style;
  }

  private handleFocusIn = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement) {
      this.activeElement = e.target;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Up', 'Down', 'Left', 'Right'].includes(e.key);
    const isEnter = e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23; // 23 is Android DPAD_CENTER
    const isBack = e.key === 'Escape' || e.key === 'Back' || e.keyCode === 27 || e.keyCode === 4; // 4 is Android KEYCODE_BACK

    // If arrow keys used, auto-activate TV Mode if not already active
    if (isArrow && !this.isTVMode) {
      this.setTVMode(true);
    }

    if (!isArrow && !isEnter && !isBack) return;

    // Handle Back Button on TV Remote
    if (isBack) {
      // Find open modals or closeable drawers first
      const closeButtons = document.querySelectorAll<HTMLElement>(
        '[title*="Close"], [aria-label*="Close"], button:has(svg.lucide-x)'
      );
      if (closeButtons.length > 0) {
        e.preventDefault();
        const topClose = closeButtons[closeButtons.length - 1];
        topClose.click();
        return;
      }
    }

    // Spatial Navigation for D-Pad
    if (isArrow) {
      // Don't intercept arrow keys inside text inputs
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // Allow leaving input with up/down
        } else {
          return;
        }
      }

      e.preventDefault();
      this.navigateDirection(e.key);
    }
  };

  /**
   * Spatial 2D vector navigation algorithm
   */
  private navigateDirection(direction: string) {
    const current = (document.activeElement as HTMLElement) || this.activeElement;
    const focusables = this.getAllFocusableElements();

    if (focusables.length === 0) return;

    if (!current || !focusables.includes(current)) {
      this.focusFirstInteractiveElement();
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const el of focusables) {
      if (el === current) continue;

      const rect = el.getBoundingClientRect();
      // Skip offscreen / invisible elements
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      if (rect.right < 0 || rect.left > window.innerWidth) continue;

      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isCandidate = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      if (direction.includes('Up') && dy < -5) {
        isCandidate = true;
        primaryDistance = Math.abs(dy);
        secondaryDistance = Math.abs(dx);
      } else if (direction.includes('Down') && dy > 5) {
        isCandidate = true;
        primaryDistance = Math.abs(dy);
        secondaryDistance = Math.abs(dx);
      } else if (direction.includes('Left') && dx < -5) {
        isCandidate = true;
        primaryDistance = Math.abs(dx);
        secondaryDistance = Math.abs(dy);
      } else if (direction.includes('Right') && dx > 5) {
        isCandidate = true;
        primaryDistance = Math.abs(dx);
        secondaryDistance = Math.abs(dy);
      }

      if (isCandidate) {
        // Weighted Manhattan metric penalizing off-axis divergence
        const score = primaryDistance * 1.0 + secondaryDistance * 2.5;
        if (score < minDistance) {
          minDistance = score;
          bestCandidate = el;
        }
      }
    }

    if (bestCandidate) {
      bestCandidate.focus();
      bestCandidate.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      this.activeElement = bestCandidate;
    }
  }

  private getAllFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]'
    ].join(', ');

    return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      // Must be visible
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetParent !== null
      );
    });
  }

  public focusFirstInteractiveElement() {
    const focusables = this.getAllFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
      focusables[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.activeElement = focusables[0];
    }
  }
}

export const tvNavigation = new TVNavigationService();
