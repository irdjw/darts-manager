/**
 * ============================================================================
 * PERFORMANCE.TS — Web Vitals Monitoring & Optimisation Utilities
 * ============================================================================
 *
 * PURPOSE:
 * Measures the five Core Web Vitals (FCP, LCP, FID, CLS, TTFB) using the
 * browser's PerformanceObserver API, and provides utilities for lazy image
 * loading, debounce/throttle, resource preloading, and memory monitoring.
 *
 * WEB VITALS QUICK REFERENCE:
 *   FCP  — First Contentful Paint: when the first text/image renders
 *   LCP  — Largest Contentful Paint: when the main content element renders
 *   FID  — First Input Delay: how long until the first click/tap is handled
 *   CLS  — Cumulative Layout Shift: how much the page jumps around while loading
 *   TTFB — Time to First Byte: how long the server takes to start responding
 *
 * INIT FLOW:
 *   initPerformanceMonitoring()  ← call once on app startup
 *     ├── measureFCP()           — starts a PerformanceObserver for 'paint'
 *     ├── measureLCP()           — starts an observer for 'largest-contentful-paint'
 *     ├── measureFID()           — starts an observer for 'first-input'
 *     ├── measureCLS()           — starts an observer for 'layout-shift'
 *     ├── measureTTFB()          — starts an observer for 'navigation'
 *     └── window.onload          — logs all metrics after 5s delay
 *
 * CLS ALGORITHM (the trickiest one):
 *   Layout shifts are grouped into "sessions" — a session is a sequence of
 *   shifts where each shift happens < 1s after the previous, and the total
 *   session duration is < 5s. CLS is the LARGEST session value, not the sum
 *   of all shifts. Shifts caused by user input (hadRecentInput = true) are
 *   excluded.
 *
 * ⚠️ NOTES:
 *   - sendMetricsToAnalytics() is a stub (just console.logs). Wire it to
 *     your analytics service when you're ready.
 *   - debounce() here duplicates the one in helpers.ts. Use whichever is
 *     closer to your import path.
 *   - monitorMemoryUsage() uses performance.memory which is Chrome-only
 *     and returns approximate values.
 */

// Performance monitoring and optimization utilities

// ==========================================================================
// TYPES
// ==========================================================================

interface PerformanceMetrics {
  fcp: number | null;   // First Contentful Paint (ms)
  lcp: number | null;   // Largest Contentful Paint (ms)
  fid: number | null;   // First Input Delay (ms)
  cls: number | null;   // Cumulative Layout Shift (unitless, lower is better)
  ttfb: number | null;  // Time to First Byte (ms)
}

// Module-level store — populated by the observers as metrics come in.
let metrics: PerformanceMetrics = {
  fcp: null, lcp: null, fid: null, cls: null, ttfb: null
};

// ==========================================================================
// INIT
// ==========================================================================

/**
 * Start all five metric observers. Call once on app startup.
 * SSR-safe: no-ops on the server (typeof window check).
 * Logs the final metrics 5 seconds after page load to give LCP time to fire.
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  measureFCP();
  measureLCP();
  measureFID();
  measureCLS();
  measureTTFB();

  window.addEventListener('load', () => {
    setTimeout(() => { logMetrics(); }, 5000);   // 5s delay: LCP can fire late
  });
}

// ==========================================================================
// INDIVIDUAL MEASUREMENTS
// ==========================================================================

/** FCP: fires once when the first paint event occurs. */
function measureFCP(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = entry.startTime;
        console.log('FCP:', entry.startTime);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('Performance Observer not supported for paint');
  }
}

/** LCP: fires multiple times as larger elements render; we keep the last one. */
function measureLCP(): void {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];   // LCP is always the latest entry
    metrics.lcp = lastEntry.startTime;
    console.log('LCP:', lastEntry.startTime);
  });

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('Performance Observer not supported for LCP');
  }
}

/** FID: time between user's first interaction and the browser handling it. */
function measureFID(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // processingStart - startTime = how long the browser was busy before handling the input
      metrics.fid = (entry as any).processingStart - entry.startTime;
      console.log('FID:', metrics.fid);
    }
  });

  try {
    observer.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('Performance Observer not supported for FID');
  }
}

/**
 * CLS: tracks layout shifts in sessions (see module header for algorithm).
 * hadRecentInput shifts are excluded — they're caused by the user, not the page.
 */
function measureCLS(): void {
  let clsValue = 0;                         // Largest session value seen so far
  let sessionValue = 0;                     // Running total for current session
  let sessionEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {  // Exclude user-triggered shifts
        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry  = sessionEntries[sessionEntries.length - 1];

        // Extend session if: < 1s gap from last shift AND < 5s total duration
        if (sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000) {
          sessionValue += (entry as any).value;
          sessionEntries.push(entry);
        } else {
          // Start a new session
          sessionValue = (entry as any).value;
          sessionEntries = [entry];
        }

        // CLS = max session value
        if (sessionValue > clsValue) {
          clsValue = sessionValue;
          metrics.cls = clsValue;
          console.log('CLS:', clsValue);
        }
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('Performance Observer not supported for CLS');
  }
}

/** TTFB: how long the server took to start sending the response. */
function measureTTFB(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        // responseStart = first byte received; requestStart = request sent
        metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        console.log('TTFB:', metrics.ttfb);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['navigation'] });
  } catch (e) {
    console.warn('Performance Observer not supported for navigation');
  }
}

// ==========================================================================
// REPORTING
// ==========================================================================

/** Log all collected metrics to the console (grouped). */
function logMetrics(): void {
  console.group('Performance Metrics');
  console.log('First Contentful Paint (FCP):', metrics.fcp, 'ms');
  console.log('Largest Contentful Paint (LCP):', metrics.lcp, 'ms');
  console.log('First Input Delay (FID):', metrics.fid, 'ms');
  console.log('Cumulative Layout Shift (CLS):', metrics.cls);
  console.log('Time to First Byte (TTFB):', metrics.ttfb, 'ms');
  console.groupEnd();

  sendMetricsToAnalytics(metrics);
}

/** ⚠️ STUB — wire to your analytics service (e.g. Datadog, Mixpanel). */
function sendMetricsToAnalytics(metrics: PerformanceMetrics): void {
  console.log('Analytics: Performance metrics recorded', metrics);
}

/** Get a snapshot of the current metrics (some may still be null). */
export function getMetrics(): PerformanceMetrics {
  return { ...metrics };   // Shallow copy — prevents external mutation
}

// ==========================================================================
// IMAGE LAZY LOADING
// ==========================================================================

/**
 * Lazy-load images that have a data-src attribute instead of src.
 * Uses IntersectionObserver to detect when an image scrolls into view,
 * then swaps data-src → src to trigger the actual fetch.
 *
 * HTML pattern:
 *   <img data-src="/images/photo.jpg" alt="..." />
 *
 * Call setupImageLazyLoading() once after the DOM is ready.
 */
export function setupImageLazyLoading(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;                        // Start loading the image
            img.removeAttribute('data-src');      // Clean up the data attribute
            imageObserver.unobserve(img);         // Stop watching this element
          }
        }
      });
    });

    // Observe all images with data-src on the page
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// ==========================================================================
// DEBOUNCE & THROTTLE
// ==========================================================================

/**
 * Debounce: delay function execution until `wait` ms after the last call.
 * ⚠️ Duplicated from helpers.ts — prefer importing from one location.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Throttle: allow function execution at most once per `limit` ms.
 * Unlike debounce (which delays until activity stops), throttle fires
 * immediately on the first call and then blocks subsequent calls for
 * the duration.
 * Useful for scroll/resize event handlers that fire rapidly.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ==========================================================================
// RESOURCE HINTS
// ==========================================================================

/**
 * Preload a specific resource (CSS, JS, image) before it's needed.
 * The `as` parameter tells the browser what type of resource it is,
 * so it can prioritise correctly.
 */
export function preloadResource(url: string, as: string = 'fetch'): void {
  const link = document.createElement('link');
  link.rel  = 'preload';
  link.href = url;
  link.as   = as;
  document.head.appendChild(link);
}

/**
 * Add preconnect and dns-prefetch hints for external domains.
 * These run early in page load to establish TCP connections before
 * the actual requests fire.
 */
export function addResourceHints(): void {
  addResourceHint('preconnect',  'https://fonts.googleapis.com');
  addResourceHint('preconnect',  'https://fonts.gstatic.com');
  addResourceHint('dns-prefetch', 'https://api.supabase.co');
}

function addResourceHint(rel: string, href: string): void {
  const link = document.createElement('link');
  link.rel  = rel;
  link.href = href;
  // crossOrigin is needed for preconnect to font CDNs that serve from a different origin
  if (rel === 'preconnect' && href.includes('fonts.gstatic.com')) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

// ==========================================================================
// MEMORY & BUNDLE DIAGNOSTICS
// ==========================================================================

/**
 * Log current JS heap usage. Chrome-only (performance.memory is non-standard).
 * Useful for spotting memory leaks during development.
 */
export function monitorMemoryUsage(): void {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used:  Math.round(memory.usedJSHeapSize  / 1048576) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
    });
  }
}

/**
 * Log all loaded resources grouped by file extension with sizes.
 * Useful for identifying large assets that could be optimised.
 * transferSize is 0 for cached resources — only accurate on first load.
 */
export function logBundleInfo(): void {
  if ('getEntriesByType' in performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    let totalSize = 0;
    const resourceTypes: { [key: string]: number } = {};

    resources.forEach((resource) => {
      if (resource.transferSize) {
        totalSize += resource.transferSize;

        const extension = resource.name.split('.').pop() || 'other';
        resourceTypes[extension] = (resourceTypes[extension] || 0) + resource.transferSize;
      }
    });

    console.group('Resource Analysis');
    console.log('Total transfer size:', Math.round(totalSize / 1024) + 'KB');
    console.log('By type:', Object.entries(resourceTypes)
      .sort(([,a], [,b]) => b - a)                          // Largest first
      .map(([type, size]) => `${type}: ${Math.round(size / 1024)}KB`)
    );
    console.groupEnd();
  }
}
