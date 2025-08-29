// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

let metrics: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  fid: null,
  cls: null,
  ttfb: null
};

// Initialize performance monitoring
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;
  
  // Measure First Contentful Paint
  measureFCP();
  
  // Measure Largest Contentful Paint
  measureLCP();
  
  // Measure First Input Delay
  measureFID();
  
  // Measure Cumulative Layout Shift
  measureCLS();
  
  // Measure Time to First Byte
  measureTTFB();
  
  // Log metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      logMetrics();
    }, 5000);
  });
}

// Measure First Contentful Paint
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

// Measure Largest Contentful Paint
function measureLCP(): void {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    metrics.lcp = lastEntry.startTime;
    console.log('LCP:', lastEntry.startTime);
  });
  
  try {
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('Performance Observer not supported for LCP');
  }
}

// Measure First Input Delay
function measureFID(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
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

// Measure Cumulative Layout Shift
function measureCLS(): void {
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
        
        if (sessionValue && 
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000) {
          sessionValue += (entry as any).value;
          sessionEntries.push(entry);
        } else {
          sessionValue = (entry as any).value;
          sessionEntries = [entry];
        }
        
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

// Measure Time to First Byte
function measureTTFB(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
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

// Log all metrics
function logMetrics(): void {
  console.group('Performance Metrics');
  console.log('First Contentful Paint (FCP):', metrics.fcp, 'ms');
  console.log('Largest Contentful Paint (LCP):', metrics.lcp, 'ms');
  console.log('First Input Delay (FID):', metrics.fid, 'ms');
  console.log('Cumulative Layout Shift (CLS):', metrics.cls);
  console.log('Time to First Byte (TTFB):', metrics.ttfb, 'ms');
  console.groupEnd();
  
  // Send to analytics if needed
  sendMetricsToAnalytics(metrics);
}

// Send metrics to analytics (mock implementation)
function sendMetricsToAnalytics(metrics: PerformanceMetrics): void {
  // In a real app, you'd send this to your analytics service
  console.log('Analytics: Performance metrics recorded', metrics);
}

// Get current metrics
export function getMetrics(): PerformanceMetrics {
  return { ...metrics };
}

// Image lazy loading utility
export function setupImageLazyLoading(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// Debounce utility for performance
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

// Throttle utility for performance
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

// Resource preloading
export function preloadResource(url: string, as: string = 'fetch'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

// Critical resource hints
export function addResourceHints(): void {
  // Preconnect to external domains
  addResourceHint('preconnect', 'https://fonts.googleapis.com');
  addResourceHint('preconnect', 'https://fonts.gstatic.com');
  
  // DNS prefetch for external resources
  addResourceHint('dns-prefetch', 'https://api.supabase.co');
}

function addResourceHint(rel: string, href: string): void {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (rel === 'preconnect' && href.includes('fonts.gstatic.com')) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

// Memory usage monitoring
export function monitorMemoryUsage(): void {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
    });
  }
}

// Bundle size analyzer
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
      .sort(([,a], [,b]) => b - a)
      .map(([type, size]) => `${type}: ${Math.round(size / 1024)}KB`)
    );
    console.groupEnd();
  }
}