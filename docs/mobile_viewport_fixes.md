# Mobile Viewport Fixes for Isaac Wilson Darts App

## Overview
These fixes address the mobile scrolling issues by implementing proper viewport handling, removing conflicting CSS rules, and ensuring all elements fit within the browser window without requiring scrolling.

## Key Changes Required

### 1. Update `src/app.html` - Optimised Viewport Configuration

```html
<!DOCTYPE html>
<html lang="en" data-theme="isaac-wilson">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    
    <!-- Optimised viewport meta tag for mobile -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    
    <!-- Prevent zoom on iOS Safari -->
    <meta name="format-detection" content="telephone=no" />
    
    <meta name="theme-color" content="#1e40af" />
    <meta name="description" content="Professional darts team management system for Isaac Wilson Darts Team" />
    
    <!-- Preload critical fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Progressive Web App -->
    <link rel="manifest" href="%sveltekit.assets%/manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Isaac Wilson Darts">
    
    <!-- CSS custom properties for viewport -->
    <style>
      :root {
        --viewport-height: 100vh;
        --viewport-width: 100vw;
        --safe-area-inset-top: env(safe-area-inset-top, 0);
        --safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
        --safe-area-inset-left: env(safe-area-inset-left, 0);
        --safe-area-inset-right: env(safe-area-inset-right, 0);
      }
      
      /* Support for dynamic viewport units */
      @supports (height: 100dvh) {
        :root {
          --viewport-height: 100dvh;
        }
      }
      
      /* Base reset for mobile */
      * {
        box-sizing: border-box;
      }
      
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: var(--viewport-height);
        overflow: hidden;
        position: relative;
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
      }
      
      /* Prevent scrolling and zooming */
      body {
        overscroll-behavior: none;
        touch-action: pan-x pan-y;
      }
      
      /* Hide address bar on mobile browsers */
      @media screen and (max-width: 768px) {
        html {
          height: -webkit-fill-available;
        }
        
        body {
          min-height: -webkit-fill-available;
        }
      }
    </style>
    
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="bg-slate-50">
    <div style="display: contents">%sveltekit.body%</div>
    
    <!-- Viewport height detection script -->
    <script>
      // Set CSS custom property for accurate viewport height
      function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }
      
      // Initial set
      setViewportHeight();
      
      // Update on resize and orientation change
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
      });
      
      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    </script>
  </body>
</html>
```

### 2. Update `src/lib/components/MobileDartEntry.svelte` - Fixed Styles

Replace the current `<style>` block with this optimised version:

```css
<style>
  /* Main container - fixed viewport handling */
  .dart-scoring-app {
    width: 100%;
    height: var(--viewport-height);
    height: calc(var(--vh, 1vh) * 100);
    max-height: var(--viewport-height);
    max-height: calc(var(--vh, 1vh) * 100);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: #1f2937;
    
    /* Safe area support for devices with notches */
    padding-top: var(--safe-area-inset-top);
    padding-bottom: var(--safe-area-inset-bottom);
    padding-left: var(--safe-area-inset-left);
    padding-right: var(--safe-area-inset-right);
  }
  
  /* Prevent unwanted interactions */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  /* Allow text selection for inputs and certain elements */
  input, textarea, [contenteditable="true"] {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
  
  /* Smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  
  /* Scrollable areas within the app */
  .scrollable-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  
  /* Custom scrollbar styling */
  .scrollable-area::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollable-area::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.1);
  }
  
  .scrollable-area::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.5);
    border-radius: 2px;
  }
  
  .scrollable-area::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }
  
  /* Focus states for accessibility */
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }
  
  /* Ensure minimum touch targets (44px) */
  button, .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Flexible grid layouts that adapt to screen size */
  .dart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
    gap: 8px;
    width: 100%;
  }
  
  /* Score display - responsive text sizing */
  .score-display {
    font-size: clamp(1.5rem, 8vw, 3rem);
    line-height: 1.2;
  }
  
  /* Input fields - full width on mobile */
  input[type="number"],
  input[type="text"],
  select {
    width: 100%;
    min-height: 44px;
    font-size: 16px; /* Prevent zoom on iOS */
    border-radius: 8px;
    border: 2px solid #374151;
    background: #1f2937;
    color: #f9fafb;
    padding: 8px 12px;
  }
  
  /* Modal overlays */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--safe-area-inset-top) var(--safe-area-inset-right) var(--safe-area-inset-bottom) var(--safe-area-inset-left);
  }
  
  .modal-content {
    background: #1f2937;
    border-radius: 12px;
    padding: 24px;
    margin: 16px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Responsive breakpoints */
  @media screen and (max-width: 480px) {
    .dart-scoring-app {
      font-size: 14px;
    }
    
    .modal-content {
      padding: 16px;
      margin: 8px;
      max-width: 95vw;
      max-height: 85vh;
    }
  }
  
  /* Landscape orientation adjustments */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    .dart-scoring-app {
      font-size: 12px;
    }
    
    .score-display {
      font-size: clamp(1rem, 6vh, 2rem);
    }
    
    button, .touch-target {
      min-height: 36px;
    }
  }
  
  /* High DPI displays */
  @media screen and (-webkit-min-device-pixel-ratio: 2) {
    .dart-scoring-app {
      -webkit-font-smoothing: antialiased;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .dart-scoring-app {
      background: #0f172a;
    }
  }
  
  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .transition-all {
      transition: none;
    }
  }
  
  /* Print styles */
  @media print {
    .dart-scoring-app {
      height: auto;
      overflow: visible;
    }
  }
</style>
```

### 3. Additional Layout Component Fix - `src/routes/+layout.svelte`

Add this CSS to ensure the layout doesn't conflict with mobile viewport:

```css
<style>
  /* Layout viewport fix */
  .min-h-screen {
    min-height: var(--viewport-height);
    min-height: calc(var(--vh, 1vh) * 100);
    display: flex;
    flex-direction: column;
  }
  
  /* Remove conflicting overflow rules */
  :global(html),
  :global(body) {
    overflow-x: hidden;
    overflow-y: hidden;
  }
  
  /* Mobile header adjustments */
  header {
    flex-shrink: 0;
    min-height: 44px;
  }
  
  /* Main content area */
  main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
```

### 4. Manifest Updates - `static/manifest.json`

Ensure your PWA manifest supports proper display:

```json
{
  "name": "Isaac Wilson Darts Team",
  "short_name": "IW Darts",
  "display": "fullscreen",
  "orientation": "portrait-primary",
  "theme_color": "#1e40af",
  "background_color": "#1f2937",
  "start_url": "/",
  "scope": "/",
  "categories": ["sports", "games"],
  "icons": [
    {
      "src": "favicon.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Implementation Steps

1. **Update `app.html`** with the new viewport configuration and JavaScript
2. **Replace styles** in `MobileDartEntry.svelte` with the fixed CSS
3. **Update layout** to remove conflicting overflow rules
4. **Test thoroughly** on various mobile devices and browsers
5. **Verify PWA** manifest settings for fullscreen display

## Key Benefits

- ✅ **No scrolling required** on mobile devices
- ✅ **Proper safe area support** for devices with notches
- ✅ **Dynamic viewport height** handling for iOS Safari
- ✅ **Touch-optimised interactions** with proper target sizes
- ✅ **Prevented zoom** on input focus and double-tap
- ✅ **Responsive design** that adapts to screen orientation
- ✅ **Progressive enhancement** with fallbacks for older browsers

## Testing Checklist

- [ ] iPhone Safari (various models)
- [ ] Android Chrome (various screen sizes)
- [ ] Landscape and portrait orientations
- [ ] PWA installation and fullscreen mode
- [ ] Touch interactions and gesture handling
- [ ] Safe area insets on devices with notches
- [ ] Performance on lower-end devices

## Browser Compatibility

- iOS Safari 12+
- Chrome Mobile 70+
- Firefox Mobile 68+
- Samsung Internet 10+
- Edge Mobile 79+

All fixes use progressive enhancement, so older browsers will receive graceful fallbacks whilst modern browsers get the full mobile-optimised experience.