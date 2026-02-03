/**
 * ============================================================================
 * PWA.TS — Progressive Web App Utilities
 * ============================================================================
 *
 * PURPOSE:
 * Handles the three pillars of PWA support:
 *   1. Service Worker registration and update detection
 *   2. Install prompt capture and display
 *   3. Offline sync and network status monitoring
 *
 * HOW PWA INSTALL WORKS (browser flow):
 *   Browser decides the app meets PWA criteria (manifest, service worker, HTTPS)
 *        ↓
 *   Browser fires 'beforeinstallprompt' event
 *        ↓
 *   This module captures the event, stores it in deferredPrompt
 *        ↓
 *   Dispatches 'pwa-installable' CustomEvent → UI shows an "Install" button
 *        ↓
 *   User clicks "Install" → showInstallPrompt() calls deferredPrompt.prompt()
 *        ↓
 *   Browser shows its native install dialog
 *        ↓
 *   If accepted: 'appinstalled' event fires → UI hides the button
 *
 * SERVICE WORKER LIFECYCLE:
 *   registerServiceWorker()
 *     └── navigator.serviceWorker.register('/service-worker.js')
 *           └── on 'updatefound':
 *                 └── new worker installs → if controller exists, app is updated
 *                       └── dispatches 'pwa-update-available' event
 *
 * OFFLINE SYNC:
 *   setupOfflineSync() registers a Background Sync tag ('sync-attendance')
 *   when the device comes back online. The service worker then handles
 *   the actual sync logic. Note: Background Sync has limited browser support.
 *
 * NETWORK UTILITIES:
 *   isOnline()                — navigator.onLine (synchronous, instant)
 *   onNetworkChange(callback) — subscribe to online/offline events;
 *                                returns a cleanup function
 *   clearCache()              — wipe all service worker caches
 *   getCacheSize()            — estimate total storage usage (bytes)
 *
 * ⚠️ NOTES:
 *   - The service worker file itself (/service-worker.js) is NOT in this
 *     codebase. It must exist at the root for registration to succeed.
 *   - showInstallButton() / hideInstallButton() don't manipulate the DOM
 *     directly. They dispatch CustomEvents that UI components listen for.
 *     This keeps the PWA logic decoupled from specific components.
 */

// Progressive Web App utilities

// ==========================================================================
// TYPES & GLOBALS
// ==========================================================================

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Augment WindowEventMap so TypeScript knows about 'beforeinstallprompt'.
declare global {
  interface WindowEventMap {
    beforeinstallprompt: Event & {
      preventDefault(): void;
      prompt(): Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
  }
}

// Module-level state — the captured install prompt and whether it's available.
let deferredPrompt: PWAInstallPrompt | null = null;
let isInstallable = false;

// ==========================================================================
// SERVICE WORKER
// ==========================================================================

/**
 * Register the service worker. Returns the registration object (or null on failure).
 * Also sets up an 'updatefound' listener so the app can notify the user when
 * a new version is available.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'   // Service worker controls the entire origin
    });

    console.log('Service Worker registered successfully:', registration);

    // Listen for updates: when a new service worker installs while an old one
    // is still active, we know the app has been updated.
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          // 'installed' + controller exists = update is ready but not yet active
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate();   // Dispatch event → UI can show "Update available" banner
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// ==========================================================================
// INSTALL PROMPT
// ==========================================================================

/**
 * Listen for the browser's beforeinstallprompt event and capture it.
 * Call this once on app startup. The prompt is stored and used later
 * when the user taps the "Install" button.
 */
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    console.log('PWA install prompt available');
    event.preventDefault();                    // Prevent Chrome's auto-prompt
    deferredPrompt = event as any;             // Capture for later use
    isInstallable = true;

    showInstallButton();                       // Tell the UI to show the install button
  });

  // When the PWA is actually installed (from any source), clean up.
  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
    isInstallable = false;
    hideInstallButton();
  });
}

/**
 * Trigger the native install dialog.
 * Returns true if the user accepted, false if dismissed or no prompt available.
 * Can only be called in response to a user gesture (click/tap).
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return false;
  }

  try {
    await deferredPrompt.prompt();                          // Show the native dialog
    const { outcome } = await deferredPrompt.userChoice;    // Wait for user's choice

    console.log('Install prompt result:', outcome);

    // Prompt can only be used once — clear it
    deferredPrompt = null;
    isInstallable = false;

    return outcome === 'accepted';
  } catch (error) {
    console.error('Install prompt failed:', error);
    return false;
  }
}

/** Is the install prompt currently available? */
export function canInstall(): boolean {
  return isInstallable;
}

// ==========================================================================
// UI EVENTS (decoupled from DOM)
// ==========================================================================

// These fire CustomEvents rather than directly showing/hiding elements.
// Components listen for these events and manage their own DOM.

function showInstallButton(): void {
  window.dispatchEvent(new CustomEvent('pwa-installable'));
}

function hideInstallButton(): void {
  window.dispatchEvent(new CustomEvent('pwa-installed'));
}

function notifyUpdate(): void {
  window.dispatchEvent(new CustomEvent('pwa-update-available'));
}

// ==========================================================================
// OFFLINE SYNC
// ==========================================================================

/**
 * Register a Background Sync tag when the device comes back online.
 * The service worker listens for the 'sync-attendance' tag and replays
 * any queued attendance writes.
 *
 * ⚠️ Background Sync has limited browser support (Chrome/Edge only as of 2024).
 */
export function setupOfflineSync(): void {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background sync not supported');
    return;
  }

  window.addEventListener('online', () => {
    navigator.serviceWorker.ready.then(registration => {
      return registration.sync.register('sync-attendance');
    });
  });
}

// ==========================================================================
// CACHE MANAGEMENT
// ==========================================================================

/**
 * Delete ALL service worker caches. Useful for a "clear cache" button
 * in settings or for troubleshooting stale data.
 */
export async function clearCache(): Promise<void> {
  if (!('caches' in window)) {
    console.log('Cache API not supported');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Estimate total storage usage in bytes.
 * navigator.storage.estimate() returns usage (bytes used) and quota (max allowed).
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window) || !('storage' in navigator) || !('estimate' in navigator.storage)) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}

// ==========================================================================
// NETWORK STATUS
// ==========================================================================

/** Synchronous check — is the device currently online? */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Subscribe to network status changes.
 * callback(true)  = came online
 * callback(false) = went offline
 *
 * Returns a cleanup function — call it to unsubscribe.
 */
export function onNetworkChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline  = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online',  handleOnline);
  window.addEventListener('offline', handleOffline);

  // Cleanup function — removes both listeners
  return () => {
    window.removeEventListener('online',  handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
