/**
 * ============================================================================
 * KEYBOARD.TS — Keyboard Shortcuts & Accessibility Utilities
 * ============================================================================
 *
 * PURPOSE:
 * Two responsibilities in one file:
 *   1. KeyboardManager — registers and dispatches keyboard shortcuts
 *   2. AccessibilityManager — screen-reader announcements, skip links,
 *      focus trapping for modals, ARIA helpers
 *
 * KEYBOARD SHORTCUTS (default set):
 *   Navigation:
 *     Alt+D  → Dashboard        Alt+A  → Attendance
 *     Alt+S  → Statistics       Alt+T  → Team Selection
 *     Alt+W  → Warmup/Practice
 *   Utility:
 *     Alt+H    → Toggle keyboard help modal
 *     Escape   → Close modal / dispatch escape event
 *     Ctrl+F   → Focus the search input (if one exists on page)
 *   Application:
 *     Ctrl+Shift+R  → Hard refresh
 *     Ctrl+Shift+L  → Logout
 *
 * KEY PATTERNS:
 *
 *   1. SHORTCUT KEY ENCODING:
 *      Each shortcut is stored in a Map keyed by a string like "alt+d" or
 *      "ctrl+shift+r". getShortcutKey() builds this string from the
 *      modifier flags + key character. This makes lookup O(1) on keypress.
 *
 *   2. INPUT FIELD GUARD:
 *      isInputFocused() prevents shortcuts from firing while the user is
 *      typing in an <input>, <textarea>, <select>, or contenteditable element.
 *      Without this, pressing 'd' while searching would navigate to Dashboard.
 *
 *   3. CUSTOM EVENT DISPATCH:
 *      Escape and the help modal use CustomEvent rather than direct DOM
 *      manipulation. Components listen for 'keyboard-escape' or
 *      'keyboard-help-toggle' on window and react accordingly. This
 *      decouples the keyboard manager from specific component logic.
 *
 *   4. CLEANUP ON UNLOAD:
 *      The global keydown listener is added on module load and removed
 *      on beforeunload. Without removal, the listener would leak if the
 *      module were dynamically re-imported.
 *
 * ACCESSIBILITY MANAGER:
 *   - announce(message, priority) — pushes text to a visually-hidden
 *     aria-live region so screen readers read it aloud.
 *   - trapFocus(container) — keeps Tab cycling within a modal. Returns a
 *     cleanup function to call when the modal closes.
 *   - Skip link — injected into <body> on construction; visible only on
 *     keyboard focus, jumps to #main-content.
 *
 * ⚠️ NOTES:
 *   - stopListening() creates a NEW bound function via .bind(this), which
 *     is NOT the same reference as the one added in startListening().
 *     removeEventListener will silently fail. The listener is never actually
 *     removed. Fix: store the bound handler as a class property.
 *   - setupFocusManagement() logs every focus change to console. This is
 *     useful for debugging but should be removed or gated behind a debug
 *     flag for production.
 */

// Keyboard shortcuts and accessibility utilities

// ==========================================================================
// TYPES
// ==========================================================================

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: (event: KeyboardEvent) => void;
  description: string;       // Shown in the help modal
  category?: string;         // Groups shortcuts in the help modal
}

// ==========================================================================
// KEYBOARD MANAGER
// ==========================================================================

class KeyboardManager {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private isListening = false;
  private helpModalVisible = false;

  constructor() {
    this.setupDefaultShortcuts();
  }

  // ── Default shortcuts ───────────────────────────────────────────────────
  private setupDefaultShortcuts(): void {
    // Navigation — Alt + letter navigates to a page
    this.register({ key: 'd', altKey: true, action: () => this.navigate('/dashboard'),      description: 'Go to Dashboard',               category: 'Navigation' });
    this.register({ key: 'a', altKey: true, action: () => this.navigate('/attendance'),     description: 'Go to Attendance',              category: 'Navigation' });
    this.register({ key: 's', altKey: true, action: () => this.navigate('/statistics'),     description: 'Go to Statistics',             category: 'Navigation' });
    this.register({ key: 't', altKey: true, action: () => this.navigate('/team-selection'), description: 'Go to Team Selection',        category: 'Navigation' });
    this.register({ key: 'w', altKey: true, action: () => this.navigate('/warmup'),         description: 'Go to Practice/Warmup',       category: 'Navigation' });

    // Utility
    this.register({ key: 'h', altKey: true, action: () => this.toggleHelpModal(),          description: 'Show/Hide Keyboard Shortcuts', category: 'Utility' });
    this.register({ key: 'Escape',         action: (event) => this.handleEscape(event),    description: 'Close modals/Cancel actions',  category: 'Utility' });
    this.register({ key: 'f', ctrlKey: true, action: (event) => this.handleFind(event),    description: 'Search/Find',                  category: 'Utility' });

    // Application
    this.register({ key: 'r', ctrlKey: true, shiftKey: true, action: (event) => { event.preventDefault(); window.location.reload(); }, description: 'Hard refresh page', category: 'Application' });
    this.register({ key: 'l', ctrlKey: true, shiftKey: true, action: () => this.navigate('/logout'),  description: 'Logout',             category: 'Application' });
  }

  // ── Registration ────────────────────────────────────────────────────────
  /** Add a new shortcut. Overwrites if the same key combo already exists. */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /** Remove a shortcut by its key combo. */
  unregister(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  // ── Key encoding ────────────────────────────────────────────────────────
  // Builds the Map key string from modifier flags + key character.
  // Example: { ctrlKey: true, shiftKey: true, key: 'r' } → "ctrl+shift+r"
  private getShortcutKey(shortcut: Partial<KeyboardShortcut>): string {
    const modifiers = [];
    if (shortcut.ctrlKey)  modifiers.push('ctrl');
    if (shortcut.altKey)   modifiers.push('alt');
    if (shortcut.shiftKey) modifiers.push('shift');
    if (shortcut.metaKey)  modifiers.push('meta');

    return `${modifiers.join('+')}${modifiers.length ? '+' : ''}${shortcut.key?.toLowerCase()}`;
  }

  // ── Listening lifecycle ─────────────────────────────────────────────────
  startListening(): void {
    if (this.isListening) return;
    this.isListening = true;
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  // ⚠️ BUG: .bind(this) creates a NEW function reference each time.
  // removeEventListener won't match the listener added in startListening().
  // The listener is never actually removed.
  stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  // ── Keydown handler ─────────────────────────────────────────────────────
  private handleKeyDown(event: KeyboardEvent): void {
    // Don't fire shortcuts while the user is typing
    if (this.isInputFocused()) return;

    const key = this.getShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey
    });

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();        // Prevent browser default (e.g. Ctrl+F opening find bar)
      shortcut.action(event);
    }
  }

  // ── Input guard ─────────────────────────────────────────────────────────
  // Returns true if the currently focused element is a text input.
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName   = activeElement.tagName.toLowerCase();
    const isEditable = activeElement.getAttribute('contenteditable') === 'true';

    return (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable);
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  // Uses window.location.href rather than SvelteKit's goto().
  // This causes a full page reload rather than a client-side transition.
  // Using goto() here would require importing it, which would couple this
  // utility to SvelteKit.
  private navigate(path: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }

  // ── Help modal ──────────────────────────────────────────────────────────
  private toggleHelpModal(): void {
    this.helpModalVisible = !this.helpModalVisible;
    this.dispatchHelpModalEvent();
  }

  // Dispatch a CustomEvent so the KeyboardHelp component can react.
  // The event carries the current shortcuts list for rendering.
  private dispatchHelpModalEvent(): void {
    const event = new CustomEvent('keyboard-help-toggle', {
      detail: { visible: this.helpModalVisible, shortcuts: this.getShortcutsList() }
    });
    window.dispatchEvent(event);
  }

  // ── Escape handling ─────────────────────────────────────────────────────
  private handleEscape(event: KeyboardEvent): void {
    if (this.helpModalVisible) {
      this.helpModalVisible = false;
      this.dispatchHelpModalEvent();
      return;    // Escape consumed by closing the help modal
    }

    // No modal open — dispatch a generic escape event for other components
    window.dispatchEvent(new CustomEvent('keyboard-escape'));
  }

  // ── Find / search ───────────────────────────────────────────────────────
  private handleFind(event: KeyboardEvent): void {
    event.preventDefault();   // Block browser's Ctrl+F

    // Try to find a search input on the page and focus it
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      return;
    }

    // No search input found — dispatch event for components to handle
    window.dispatchEvent(new CustomEvent('keyboard-find'));
  }

  // ── Help data ───────────────────────────────────────────────────────────
  /** All registered shortcuts with a human-readable key display string. */
  getShortcutsList(): Array<KeyboardShortcut & { keyDisplay: string }> {
    return Array.from(this.shortcuts.values()).map(shortcut => ({
      ...shortcut,
      keyDisplay: this.getKeyDisplay(shortcut)
    }));
  }

  /** Format modifiers + key for display: "Ctrl + Shift + R" */
  private getKeyDisplay(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.metaKey)  modifiers.push('⌘');
    if (shortcut.ctrlKey)  modifiers.push('Ctrl');
    if (shortcut.altKey)   modifiers.push('Alt');
    if (shortcut.shiftKey) modifiers.push('⇧');

    const keyDisplay = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
    return `${modifiers.join(' + ')}${modifiers.length ? ' + ' : ''}${keyDisplay}`;
  }
}

// ==========================================================================
// ACCESSIBILITY MANAGER
// ==========================================================================

class AccessibilityManager {
  private announcer: HTMLElement | null = null;

  constructor() {
    this.createAnnouncer();
    this.setupSkipLinks();
    this.setupFocusManagement();
  }

  // ── Screen reader announcer ───────────────────────────────────────────
  // A visually-hidden <div> with aria-live="polite". Setting its textContent
  // causes screen readers to read the new text aloud.
  private createAnnouncer(): void {
    if (typeof document === 'undefined') return;

    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');   // Read the whole thing, not just the change
    // Off-screen positioning (visually hidden but accessible to screen readers)
    this.announcer.style.cssText = `position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;`;
    document.body.appendChild(this.announcer);
  }

  /**
   * Announce a message to screen readers.
   * priority = 'assertive' interrupts whatever the reader is saying.
   * priority = 'polite' waits for a natural pause.
   * The text is cleared after 1 second so repeated announcements of the
   * same message still fire.
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;

    setTimeout(() => {
      if (this.announcer) this.announcer.textContent = '';
    }, 1000);
  }

  // ── Skip link ─────────────────────────────────────────────────────────
  // Injected at the top of <body>. Only visible on keyboard focus (Tab).
  // Jumps to #main-content, letting keyboard users skip the nav bar.
  private setupSkipLinks(): void {
    if (typeof document === 'undefined') return;

    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `position:absolute;top:-40px;left:6px;background:#000;color:#fff;padding:8px;text-decoration:none;z-index:1000;transition:top 0.2s;`;

    skipLink.addEventListener('focus', () => { skipLink.style.top = '6px'; });
    skipLink.addEventListener('blur',  () => { skipLink.style.top = '-40px'; });

    document.body.insertAdjacentElement('afterbegin', skipLink);
  }

  // ── Focus management ──────────────────────────────────────────────────
  // Adds keyboard-navigation class to <body> on Tab press (can be styled
  // to show focus rings only for keyboard users).
  // ⚠️ Also logs every focus change — useful for debugging, noisy in prod.
  private setupFocusManagement(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      console.log('Focus moved to:', target.tagName, target.className, target.id);   // ⚠️ Debug log
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  /**
   * FOCUS TRAP — keeps Tab cycling within a container (used for modals).
   *
   * When the user Tabs past the last focusable element, focus wraps to
   * the first. Shift+Tab past the first wraps to the last.
   *
   * Returns a cleanup function — call it when the modal closes to remove
   * the keydown listener and stop trapping.
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement  = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();       // Wrap: Shift+Tab from first → last
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();      // Wrap: Tab from last → first
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    if (firstElement) firstElement.focus();   // Move focus into the modal

    return () => container.removeEventListener('keydown', handleKeyDown);
  }

  /** Restore focus to a previously saved element (e.g. the button that opened a modal). */
  restoreFocus(element: HTMLElement | null): void {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }

  // ── ARIA attribute helpers ────────────────────────────────────────────
  setAriaExpanded(element: HTMLElement, expanded: boolean): void { element.setAttribute('aria-expanded', expanded.toString()); }
  setAriaPressed(element: HTMLElement, pressed: boolean): void   { element.setAttribute('aria-pressed',  pressed.toString());  }
  setAriaSelected(element: HTMLElement, selected: boolean): void { element.setAttribute('aria-selected', selected.toString()); }

  /**
   * Create an additional aria-live region and append it to <body>.
   * Useful when you need multiple independent announcement channels.
   */
  addLiveRegion(id: string, level: 'polite' | 'assertive' = 'polite'): HTMLElement {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', level);
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = `position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;`;
    document.body.appendChild(region);
    return region;
  }
}

// ==========================================================================
// GLOBAL INSTANCES & AUTO-INIT
// ==========================================================================

export const keyboardManager     = new KeyboardManager();
export const accessibilityManager = new AccessibilityManager();

// Start listening for keystrokes on module load (browser only).
// Cleanup on tab close.
if (typeof window !== 'undefined') {
  keyboardManager.startListening();

  window.addEventListener('beforeunload', () => {
    keyboardManager.stopListening();   // ⚠️ See stopListening bug note above
  });
}

// ==========================================================================
// CONVENIENCE EXPORTS
// ==========================================================================

/** Get all registered shortcuts with display strings (for help modals). */
export function getKeyboardShortcuts(): Array<KeyboardShortcut & { keyDisplay: string }> {
  return keyboardManager.getShortcutsList();
}

/** Shortcut for screen-reader announcements from anywhere in the app. */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  accessibilityManager.announce(message, priority);
}
