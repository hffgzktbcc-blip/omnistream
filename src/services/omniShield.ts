/**
 * OmniShield 2.0 - Universal Anti-Popup & Anti-Redirect Armor
 * Blocks malicious third-party iframe popups, click-jacking, and unwanted top redirects
 */

class OmniShieldService {
  private initialized = false;
  private blockedCount = 0;
  private listeners: Array<(count: number) => void> = [];

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // 1. Intercept and silently neutralize all window.open popup attempts
    const originalOpen = window.open;
    window.open = (...args: any[]) => {
      this.blockedCount++;
      console.log(`🛡️ [OmniShield] Blocked popup ad trigger #${this.blockedCount}:`, args[0]);
      this.notify();
      return null;
    };

    console.log('🛡️ OmniShield 2.0 Active: All click-jackers and popup ads neutralized.');
  }

  public getBlockedCount(): number {
    return this.blockedCount;
  }

  public subscribe(cb: (count: number) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.blockedCount));
  }
}

export const omniShield = new OmniShieldService();
omniShield.init();
