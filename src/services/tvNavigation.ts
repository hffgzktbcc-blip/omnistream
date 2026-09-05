// OmniStream Android TV & D-Pad Remote Spatial Navigation Engine
// Handles 10-foot UI focus, 2D arrow navigation, Enter/OK selection, Back button hierarchy, and auto-scrolling

class TVNavigationService {
  private isTVMode: boolean = false;
  private activeElement: HTMLElement | null = null;
  private initialized: boolean = false;
  private focusRingStyleElement: HTMLStyleElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isAndroidOrTV = /Android|AndroidTV|GoogleTV|AFTB|AFTM|BRAVIA|SmartTV|CrKey/i.test(ua);
      const isCapacitor = !!(window as any).Capacitor || window.location.protocol === 'capacitor:';
      const stored = localStorage.getItem('omnistream_tv_mode');

      // Auto-enable TV mode if running on Android/Capacitor or TV box
      this.isTVMode = stored === 'true' || (stored === null && (isAndroidOrTV || isCapacitor));
    }
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
      document.documentElement.classList.add('tv-mode');
      // Delay auto-focus until initial DOM rendering completes
      setTimeout(() => {
        this.focusFirstInteractiveElement();
      }, 400);
    }

    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('focusin', this.handleFocusIn);

    // Mutation observer to ensure newly rendered cards receive tabindex="0"
    this.setupCardAccessibilityObserver();
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
      document.documentElement.classList.add('tv-mode');
      this.focusFirstInteractiveElement();
    } else {
      document.body.classList.remove('tv-mode');
      document.documentElement.classList.remove('tv-mode');
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
      /* High-Visibility Golden Glow for Android TV Remote Navigation */
      :focus-visible,
      .tv-mode :focus,
      .tv-focused {
        outline: none !important;
        box-shadow: 0 0 0 3.5px #f59e0b, 0 0 28px rgba(245, 158, 11, 0.75) !important;
        border-color: #fbbf24 !important;
        transform: scale(1.04) !important;
        transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease, border-color 0.15s ease !important;
        z-index: 40 !important;
        scroll-margin: 80px !important;
      }

      /* Active Button / Card Press Ripple */
      .tv-pressed {
        transform: scale(0.97) !important;
        box-shadow: 0 0 0 4px #10b981, 0 0 32px rgba(16, 185, 129, 0.95) !important;
        transition: transform 0.08s ease !important;
      }

      /* 10-Foot UI Experience for TV screens */
      html.tv-mode, body.tv-mode {
        scroll-behavior: smooth !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        overscroll-behavior: none !important;
      }

      body.tv-mode button,
      body.tv-mode [role="button"],
      body.tv-mode a,
      body.tv-mode [tabindex="0"] {
        cursor: pointer;
      }

      /* Prevent focused card from being cut off by scroll container padding */
      body.tv-mode [tabindex="0"]:focus,
      body.tv-mode button:focus,
      body.tv-mode [role="button"]:focus {
        position: relative;
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

  private setupCardAccessibilityObserver() {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      const clickables = document.querySelectorAll<HTMLElement>('.cursor-pointer:not([tabindex]), [data-focusable="true"]:not([tabindex])');
      clickables.forEach((el) => {
        el.setAttribute('tabindex', '0');
        if (!el.getAttribute('role')) {
          el.setAttribute('role', 'button');
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Up', 'Down', 'Left', 'Right'].includes(e.key) ||
      [19, 20, 21, 22, 37, 38, 39, 40].includes(e.keyCode);

    const isEnter = e.key === 'Enter' || e.key === 'Select' ||
      [13, 23, 66, 160].includes(e.keyCode); // 23: Android DPAD_CENTER, 66: Android ENTER

    const isBack = e.key === 'Escape' || e.key === 'Back' ||
      [27, 4].includes(e.keyCode); // 4: Android KEYCODE_BACK

    const isPageDown = e.key === 'PageDown' || [34, 167].includes(e.keyCode);
    const isPageUp = e.key === 'PageUp' || [33, 166].includes(e.keyCode);

    // Auto-enable TV Mode on arrow/d-pad usage
    if (isArrow && !this.isTVMode) {
      this.setTVMode(true);
    }

    if (!isArrow && !isEnter && !isBack && !isPageDown && !isPageUp) return;

    // -------------------------------------------------------------
    // 1. HANDLE ENTER / OK / DPAD_CENTER
    // -------------------------------------------------------------
    if (isEnter) {
      const current = (document.activeElement as HTMLElement) || this.activeElement;
      if (current && current !== document.body) {
        // If an input is focused, let default enter submission happen
        if (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        // Visual press feedback
        current.classList.add('tv-pressed');
        setTimeout(() => current.classList.remove('tv-pressed'), 220);

        current.click();
        return;
      }
    }

    // -------------------------------------------------------------
    // 2. HANDLE BACK BUTTON (Android KEYCODE_BACK / Escape)
    // -------------------------------------------------------------
    if (isBack) {
      e.preventDefault();
      e.stopPropagation();

      // Priority A: Close Video Player if open
      const closePlayerBtn = document.querySelector<HTMLElement>('button[title*="Close Player"], button[title*="Close (Esc)"]');
      if (closePlayerBtn) {
        closePlayerBtn.click();
        return;
      }

      // Priority B: Close any open modal or drawer
      const closeButtons = document.querySelectorAll<HTMLElement>(
        '[role="dialog"] button:has(svg.lucide-x), .fixed.z-50 button:has(svg.lucide-x), [title*="Close"], [aria-label*="Close"]'
      );
      if (closeButtons.length > 0) {
        const topClose = closeButtons[closeButtons.length - 1];
        topClose.click();
        return;
      }

      // Priority C: Close live search dropdown or clear input
      const clearSearchBtn = document.querySelector<HTMLElement>('button[title="Clear search"]');
      if (clearSearchBtn) {
        clearSearchBtn.click();
        return;
      }

      // Priority D: Return focus to top Navigation Header
      const headerHomeBtn = document.querySelector<HTMLElement>('header button, nav button');
      if (headerHomeBtn && document.activeElement !== headerHomeBtn) {
        headerHomeBtn.focus();
        headerHomeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.activeElement = headerHomeBtn;
        return;
      }
      return;
    }

    // -------------------------------------------------------------
    // 3. HANDLE PAGE UP / PAGE DOWN (Fast TV Scroll)
    // -------------------------------------------------------------
    if (isPageDown || isPageUp) {
      e.preventDefault();
      const direction = isPageDown ? 1 : -1;
      window.scrollBy({ top: direction * (window.innerHeight * 0.7), behavior: 'smooth' });
      return;
    }

    // -------------------------------------------------------------
    // 4. SPATIAL D-PAD ARROW NAVIGATION
    // -------------------------------------------------------------
    if (isArrow) {
      // In text inputs, allow leaving with Up/Down but allow text editing with Left/Right
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        const isVertical = e.key === 'ArrowUp' || e.key === 'ArrowDown' || [19, 20, 38, 40].includes(e.keyCode);
        if (!isVertical) return;
      }

      e.preventDefault();
      let normalizedDir: 'Up' | 'Down' | 'Left' | 'Right' = 'Right';
      if (e.key === 'ArrowUp' || e.keyCode === 19 || e.keyCode === 38) normalizedDir = 'Up';
      else if (e.key === 'ArrowDown' || e.keyCode === 20 || e.keyCode === 40) normalizedDir = 'Down';
      else if (e.key === 'ArrowLeft' || e.keyCode === 21 || e.keyCode === 37) normalizedDir = 'Left';

      this.navigateDirection(normalizedDir);
    }
  };

  /**
   * 2D Directional Spatial Navigation Algorithm with Auto-Scroll
   */
  private navigateDirection(direction: 'Up' | 'Down' | 'Left' | 'Right') {
    const current = (document.activeElement as HTMLElement) || this.activeElement;
    const focusables = this.getAllFocusableElements();

    if (focusables.length === 0) return;

    if (!current || !focusables.includes(current) || current === document.body) {
      this.focusFirstInteractiveElement();
      return;
    }

    // Check if current is in a horizontal scrolling carousel container
    const scrollContainer = current.closest('.overflow-x-auto, [class*="overflow-x"]') as HTMLElement | null;

    // Check sibling in carousel for Left/Right
    if (scrollContainer && (direction === 'Left' || direction === 'Right')) {
      const itemsInContainer = focusables.filter((el) => scrollContainer.contains(el));
      const currentIndex = itemsInContainer.indexOf(current);

      if (currentIndex !== -1) {
        const nextIndex = direction === 'Right' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < itemsInContainer.length) {
          const target = itemsInContainer[nextIndex];
          this.applyFocus(target);
          return;
        }
      }
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate: HTMLElement | null = null;
    let minScore = Infinity;

    for (const el of focusables) {
      if (el === current) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isCandidate = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      if (direction === 'Up' && dy < -5) {
        isCandidate = true;
        primaryDist = Math.abs(dy);
        secondaryDist = Math.abs(dx);
      } else if (direction === 'Down' && dy > 5) {
        isCandidate = true;
        primaryDist = Math.abs(dy);
        secondaryDist = Math.abs(dx);
      } else if (direction === 'Left' && dx < -5) {
        isCandidate = true;
        primaryDist = Math.abs(dx);
        secondaryDist = Math.abs(dy);
      } else if (direction === 'Right' && dx > 5) {
        isCandidate = true;
        primaryDist = Math.abs(dx);
        secondaryDist = Math.abs(dy);
      }

      if (isCandidate) {
        // Directional score: heavily penalize off-axis deviation
        const score = primaryDist * 1.0 + secondaryDist * 2.8;
        if (score < minScore) {
          minScore = score;
          bestCandidate = el;
        }
      }
    }

    // Fallback if no candidate in vector cone
    if (!bestCandidate) {
      if (direction === 'Down') {
        // Find any element located further down the page
        const belowCandidates = focusables.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top > currentRect.bottom + 10;
        });
        if (belowCandidates.length > 0) {
          bestCandidate = belowCandidates[0];
        } else {
          window.scrollBy({ top: 350, behavior: 'smooth' });
        }
      } else if (direction === 'Up') {
        // Jump towards the top navigation header
        const headerButtons = document.querySelectorAll<HTMLElement>('header button, header a, header input');
        if (headerButtons.length > 0 && !Array.from(headerButtons).includes(current)) {
          bestCandidate = headerButtons[0];
        } else {
          window.scrollBy({ top: -350, behavior: 'smooth' });
        }
      }
    }

    if (bestCandidate) {
      this.applyFocus(bestCandidate);
    }
  }

  private applyFocus(el: HTMLElement) {
    el.focus();
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
    this.activeElement = el;

    // If element is inside an overflow container, ensure the container scrolls smoothly
    const scrollParent = el.closest('.overflow-x-auto, .overflow-y-auto') as HTMLElement | null;
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.right > parentRect.right) {
        scrollParent.scrollBy({ left: elRect.right - parentRect.right + 100, behavior: 'smooth' });
      } else if (elRect.left < parentRect.left) {
        scrollParent.scrollBy({ left: elRect.left - parentRect.left - 100, behavior: 'smooth' });
      }
    }
  }

  private getAllFocusableElements(): HTMLElement[] {
    // Restrict scope if modal or player dialog is open
    const modal = document.querySelector<HTMLElement>(
      '.fixed.z-50, [role="dialog"], #unified-player-container'
    );
    const scopeRoot: HTMLElement = modal || document.body;

    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[data-focusable="true"]',
      '.cursor-pointer:not([data-non-focusable])'
    ].join(', ');

    const elements = Array.from(scopeRoot.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        el.offsetParent === null
      ) {
        return false;
      }

      // Ensure tabindex="0" for native focus compatibility
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }

      return true;
    });

    return elements;
  }

  public focusFirstInteractiveElement() {
    const focusables = this.getAllFocusableElements();
    if (focusables.length > 0) {
      // Prefer active tab button or hero card if available
      const preferred = focusables.find(
        (el) => el.getAttribute('aria-selected') === 'true' || el.classList.contains('bg-blue-600')
      ) || focusables[0];

      this.applyFocus(preferred);
    }
  }
}

export const tvNavigation = new TVNavigationService();
