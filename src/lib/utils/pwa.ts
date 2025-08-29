// Progressive Web App utilities

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: Event & {
      preventDefault(): void;
      prompt(): Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
  }
}

let deferredPrompt: PWAInstallPrompt | null = null;
let isInstallable = false;

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered successfully:', registration);
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available, notify user
            notifyUpdate();
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

// Handle PWA install prompt
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    console.log('PWA install prompt available');
    event.preventDefault();
    deferredPrompt = event as any;
    isInstallable = true;
    
    // Show custom install button
    showInstallButton();
  });

  // Handle app installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
    isInstallable = false;
    hideInstallButton();
  });
}

// Show PWA install prompt
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('Install prompt result:', outcome);
    
    deferredPrompt = null;
    isInstallable = false;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('Install prompt failed:', error);
    return false;
  }
}

// Check if app can be installed
export function canInstall(): boolean {
  return isInstallable;
}

// Show install button (implement in UI)
function showInstallButton(): void {
  const event = new CustomEvent('pwa-installable');
  window.dispatchEvent(event);
}

// Hide install button (implement in UI)
function hideInstallButton(): void {
  const event = new CustomEvent('pwa-installed');
  window.dispatchEvent(event);
}

// Notify about app update
function notifyUpdate(): void {
  const event = new CustomEvent('pwa-update-available');
  window.dispatchEvent(event);
}

// Setup offline data sync
export function setupOfflineSync(): void {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background sync not supported');
    return;
  }

  // Register background sync for attendance data
  window.addEventListener('online', () => {
    navigator.serviceWorker.ready.then(registration => {
      return registration.sync.register('sync-attendance');
    });
  });
}

// Cache management
export async function clearCache(): Promise<void> {
  if (!('caches' in window)) {
    console.log('Cache API not supported');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

// Get cache size
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

// Network status utilities
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onNetworkChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}