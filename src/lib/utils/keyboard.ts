// Keyboard shortcuts and accessibility utilities

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: (event: KeyboardEvent) => void;
  description: string;
  category?: string;
}

class KeyboardManager {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private isListening = false;
  private helpModalVisible = false;
  
  constructor() {
    this.setupDefaultShortcuts();
  }
  
  private setupDefaultShortcuts(): void {
    // Navigation shortcuts
    this.register({
      key: 'd',
      altKey: true,
      action: () => this.navigate('/dashboard'),
      description: 'Go to Dashboard',
      category: 'Navigation'
    });
    
    this.register({
      key: 'a',
      altKey: true,
      action: () => this.navigate('/attendance'),
      description: 'Go to Attendance',
      category: 'Navigation'
    });
    
    this.register({
      key: 's',
      altKey: true,
      action: () => this.navigate('/statistics'),
      description: 'Go to Statistics',
      category: 'Navigation'
    });
    
    this.register({
      key: 't',
      altKey: true,
      action: () => this.navigate('/team-selection'),
      description: 'Go to Team Selection',
      category: 'Navigation'
    });
    
    this.register({
      key: 'w',
      altKey: true,
      action: () => this.navigate('/warmup'),
      description: 'Go to Practice/Warmup',
      category: 'Navigation'
    });
    
    // Utility shortcuts
    this.register({
      key: 'h',
      altKey: true,
      action: () => this.toggleHelpModal(),
      description: 'Show/Hide Keyboard Shortcuts',
      category: 'Utility'
    });
    
    this.register({
      key: 'Escape',
      action: (event) => this.handleEscape(event),
      description: 'Close modals/Cancel actions',
      category: 'Utility'
    });
    
    this.register({
      key: 'f',
      ctrlKey: true,
      action: (event) => this.handleFind(event),
      description: 'Search/Find',
      category: 'Utility'
    });
    
    // Application shortcuts
    this.register({
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      action: (event) => {
        event.preventDefault();
        window.location.reload();
      },
      description: 'Hard refresh page',
      category: 'Application'
    });
    
    this.register({
      key: 'l',
      ctrlKey: true,
      shiftKey: true,
      action: () => this.navigate('/logout'),
      description: 'Logout',
      category: 'Application'
    });
  }
  
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }
  
  unregister(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }
  
  private getShortcutKey(shortcut: Partial<KeyboardShortcut>): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('ctrl');
    if (shortcut.altKey) modifiers.push('alt');
    if (shortcut.shiftKey) modifiers.push('shift');
    if (shortcut.metaKey) modifiers.push('meta');
    
    return `${modifiers.join('+')}${modifiers.length ? '+' : ''}${shortcut.key?.toLowerCase()}`;
  }
  
  startListening(): void {
    if (this.isListening) return;
    
    this.isListening = true;
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  stopListening(): void {
    if (!this.isListening) return;
    
    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    // Skip if user is typing in an input field
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
      event.preventDefault();
      shortcut.action(event);
    }
  }
  
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = activeElement.getAttribute('contenteditable') === 'true';
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isEditable
    );
  }
  
  private navigate(path: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }
  
  private toggleHelpModal(): void {
    this.helpModalVisible = !this.helpModalVisible;
    this.dispatchHelpModalEvent();
  }
  
  private dispatchHelpModalEvent(): void {
    const event = new CustomEvent('keyboard-help-toggle', {
      detail: { visible: this.helpModalVisible, shortcuts: this.getShortcutsList() }
    });
    window.dispatchEvent(event);
  }
  
  private handleEscape(event: KeyboardEvent): void {
    // Close help modal if open
    if (this.helpModalVisible) {
      this.helpModalVisible = false;
      this.dispatchHelpModalEvent();
      return;
    }
    
    // Dispatch escape event for other components to handle
    const escapeEvent = new CustomEvent('keyboard-escape');
    window.dispatchEvent(escapeEvent);
  }
  
  private handleFind(event: KeyboardEvent): void {
    event.preventDefault();
    
    // Focus search input if it exists
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      return;
    }
    
    // Dispatch find event for components to handle
    const findEvent = new CustomEvent('keyboard-find');
    window.dispatchEvent(findEvent);
  }
  
  getShortcutsList(): Array<KeyboardShortcut & { keyDisplay: string }> {
    return Array.from(this.shortcuts.values()).map(shortcut => ({
      ...shortcut,
      keyDisplay: this.getKeyDisplay(shortcut)
    }));
  }
  
  private getKeyDisplay(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.metaKey) modifiers.push('⌘');
    if (shortcut.ctrlKey) modifiers.push('Ctrl');
    if (shortcut.altKey) modifiers.push('Alt');
    if (shortcut.shiftKey) modifiers.push('⇧');
    
    const keyDisplay = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
    return `${modifiers.join(' + ')}${modifiers.length ? ' + ' : ''}${keyDisplay}`;
  }
}

// Global keyboard manager instance
export const keyboardManager = new KeyboardManager();

// Accessibility utilities
export class AccessibilityManager {
  private announcer: HTMLElement | null = null;
  
  constructor() {
    this.createAnnouncer();
    this.setupSkipLinks();
    this.setupFocusManagement();
  }
  
  private createAnnouncer(): void {
    if (typeof document === 'undefined') return;
    
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(this.announcer);
  }
  
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }
  
  private setupSkipLinks(): void {
    if (typeof document === 'undefined') return;
    
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.2s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertAdjacentElement('afterbegin', skipLink);
  }
  
  private setupFocusManagement(): void {
    if (typeof document === 'undefined') return;
    
    // Track focus for debugging
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      console.log('Focus moved to:', target.tagName, target.className, target.id);
    });
    
    // Ensure focus is visible
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }
  
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
  
  restoreFocus(element: HTMLElement | null): void {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }
  
  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString());
  }
  
  setAriaPressed(element: HTMLElement, pressed: boolean): void {
    element.setAttribute('aria-pressed', pressed.toString());
  }
  
  setAriaSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute('aria-selected', selected.toString());
  }
  
  addLiveRegion(id: string, level: 'polite' | 'assertive' = 'polite'): HTMLElement {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', level);
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(region);
    return region;
  }
}

// Global accessibility manager instance
export const accessibilityManager = new AccessibilityManager();

// Initialize keyboard manager
if (typeof window !== 'undefined') {
  keyboardManager.startListening();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    keyboardManager.stopListening();
  });
}

// Utility functions
export function getKeyboardShortcuts(): Array<KeyboardShortcut & { keyDisplay: string }> {
  return keyboardManager.getShortcutsList();
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  accessibilityManager.announce(message, priority);
}