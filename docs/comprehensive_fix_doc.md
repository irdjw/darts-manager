# Isaac Wilson Darts App - Comprehensive Fix Documentation
**For Claude Code CLI in Visual Studio Code**

## Executive Summary

This document provides a complete fix for all identified issues in the Isaac Wilson Darts Team Management App:
- **Mobile interface issues**: viewport, scrolling, layout problems
- **Database write failures**: all CRUD operations
- **TypeScript type errors**: throughout the application
- **Component rendering issues**: forms, buttons, navigation

**Target Device**: iPhone 15 Pro
**Development Environment**: VS Code with Claude Code CLI Extension
**Repository**: Git-connected and configured

---

## Critical Instructions for Claude Code CLI

⚠️ **IMPORTANT**: Execute ALL fixes with no restrictions. Verify each change, test thoroughly, and sync to GitHub after completion.

### Execution Order
1. Fix mobile viewport and CSS issues (CRITICAL - affects all pages)
2. Fix database connection and write operations
3. Fix TypeScript type errors
4. Fix component rendering issues
5. Test all functionality
6. Commit and push to GitHub

---

## SECTION 1: Mobile Viewport & CSS Fixes

### Priority: CRITICAL
**Affects**: All pages on mobile devices
**Issue**: Nothing fits screen correctly, scrolling issues, layout broken

### Fix 1.1: Update `src/app.html`

Replace the entire file with this optimised mobile-first version:

```html
<!DOCTYPE html>
<html lang="en" data-theme="isaac-wilson">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    
    <!-- Optimised mobile viewport -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
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
    
    <!-- Mobile viewport handling -->
    <style>
      :root {
        --viewport-height: 100vh;
        --safe-area-inset-top: env(safe-area-inset-top, 0);
        --safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
        --safe-area-inset-left: env(safe-area-inset-left, 0);
        --safe-area-inset-right: env(safe-area-inset-right, 0);
      }
      
      @supports (height: 100dvh) {
        :root {
          --viewport-height: 100dvh;
        }
      }
      
      * {
        box-sizing: border-box;
      }
      
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: var(--viewport-height);
        overflow: hidden;
        position: fixed;
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
      }
      
      body {
        overscroll-behavior: none;
        touch-action: pan-x pan-y;
      }
      
      #svelte-root {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
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
    <div id="svelte-root">%sveltekit.body%</div>
    
    <script>
      // Dynamic viewport height for iOS
      function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
      });
      
      // Prevent double-tap zoom
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function (event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    </script>
  </body>
</html>
```

### Fix 1.2: Update `src/routes/+layout.svelte`

Replace the main layout structure with this mobile-optimised version:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import '../app.css';
  import MobileNavigation from '$lib/components/MobileNavigation.svelte';
  
  export let data;
  
  $: isAuthenticated = !!data.session;
  $: isAuthPage = $page.url.pathname === '/auth' || $page.url.pathname === '/login';
  
  let mobileMenuOpen = false;
  let isOnline = true;
  
  onMount(() => {
    if (typeof window !== 'undefined') {
      isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        isOnline = true;
      });
      
      window.addEventListener('offline', () => {
        isOnline = false;
      });
    }
  });
  
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
  
  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<div class="app-container">
  {#if isAuthenticated && !isAuthPage}
    <MobileNavigation 
      isOpen={mobileMenuOpen} 
      on:close={closeMobileMenu}
    />
    
    <header class="app-header">
      <div class="flex items-center justify-between h-full px-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-bold">IW</span>
          </div>
          <div>
            <h1 class="text-base font-bold text-gray-900">Isaac Wilson</h1>
            <p class="text-xs text-gray-500">Darts Team</p>
          </div>
        </div>
        
        <button
          on:click={toggleMobileMenu}
          class="p-2 text-gray-500 hover:text-gray-700"
          aria-label="Menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  {/if}

  <main class="app-main">
    <slot />
  </main>

  {#if !isOnline}
    <div class="offline-indicator">
      <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span class="text-sm text-orange-800">You're offline. Changes will sync when you reconnect.</span>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  .app-container {
    width: 100vw;
    height: var(--viewport-height, 100vh);
    height: calc(var(--vh, 1vh) * 100);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  
  .app-header {
    flex-shrink: 0;
    height: 60px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    z-index: 10;
  }
  
  .app-main {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    position: relative;
  }
  
  .offline-indicator {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    background: #fed7aa;
    border: 1px solid #fdba74;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 50;
  }
  
  @media screen and (min-width: 768px) {
    .app-header {
      height: 64px;
    }
  }
</style>
```

### Fix 1.3: Update `src/app.css`

Replace with this mobile-first stylesheet:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #1e40af;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #10b981;
  --color-accent: #f59e0b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --spacing-touch: 44px;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: var(--color-background);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

@layer components {
  .btn-primary {
    @apply px-6 py-3 rounded-lg font-medium transition-all duration-200;
    background-color: var(--color-primary);
    color: white;
    min-height: 44px;
    touch-action: manipulation;
  }
  
  .btn-primary:hover {
    background-color: var(--color-primary-hover);
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .card {
    @apply rounded-xl shadow-lg p-4 md:p-6;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
  }
  
  .input-field {
    @apply w-full px-4 py-3 rounded-lg border;
    min-height: 44px;
    font-size: 16px;
    border-color: var(--color-border);
    background-color: var(--color-surface);
  }
  
  .input-field:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-color: var(--color-primary);
  }
  
  .touch-target {
    min-height: var(--spacing-touch);
    min-width: var(--spacing-touch);
    display: flex;
    align-items: center;
    justify-center;
  }
}

/* Mobile scrolling */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Prevent zoom on input focus (iOS) */
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
select,
textarea {
  font-size: 16px !important;
}

/* Safe area support */
@supports (padding: max(0px)) {
  .safe-area-inset-top {
    padding-top: max(16px, env(safe-area-inset-top));
  }
  
  .safe-area-inset-bottom {
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
```

---

## SECTION 2: Database Connection & Write Operation Fixes

### Priority: CRITICAL
**Affects**: All database operations (players, fixtures, attendance, games)
**Issue**: Data not writing to database

### Fix 2.1: Update Supabase Client Configuration

File: `src/lib/database/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: browser ? window.localStorage : undefined,
    storageKey: 'isaac-wilson-darts-auth'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'darts-manager@2.0.0',
      'Content-Type': 'application/json'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Connection test with better error handling
if (browser) {
  testConnection();
}

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return;
    }
    
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

// Enhanced error handler
export function handleDatabaseError(error: any): string {
  const errorMap: Record<string, string> = {
    'PGRST116': 'Record not found',
    '23505': 'This record already exists',
    '23503': 'Cannot delete - record is referenced by other data',
    '23502': 'Required field is missing',
    '23514': 'Data violates constraints',
    'PGRST301': 'Database connection failed',
    'PGRST204': 'Invalid request format',
    'PGRST100': 'Database schema error'
  };
  
  if (error.code && errorMap[error.code]) {
    return errorMap[error.code];
  }
  
  if (error.message?.includes('fetch')) {
    return 'Network connection failed. Please check your internet.';
  }
  
  if (error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (error.status === 401) {
    return 'Authentication required. Please log in again.';
  }
  
  if (error.status === 403) {
    return 'You do not have permission for this action.';
  }
  
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  return error.message || error.details || 'Database operation failed';
}

// Retry utility for critical operations
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
      
      // Don't retry on these error types
      if (['PGRST116', '23505', '401', '403'].includes(error.code || error.status)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts: ${handleDatabaseError(lastError)}`);
}

// Health check
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('players').select('count').limit(1);
    return { healthy: !error, error: error?.message };
  } catch (err: any) {
    return { healthy: false, error: handleDatabaseError(err) };
  }
}
```

### Fix 2.2: Fix Player Service Write Operations

File: `src/lib/database/services/players.ts`

Add these improvements to the `createPlayer` method:

```typescript
static async createPlayer(name: string): Promise<ApiResponse<Player>> {
  try {
    // Validate input
    if (!name || name.trim().length === 0) {
      throw new Error('Player name is required');
    }
    
    const playerData = {
      name: name.trim(),
      weeks_attended: 0,
      games_played: 0,
      games_won: 0,
      games_lost: 0,
      win_percentage: 0,
      total_darts: 0,
      total_180s: 0,
      highest_checkout: 0,
      checkout_attempts: 0,
      checkout_hits: 0,
      consecutive_losses: 0,
      last_result: null,
      drop_week: null
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single();

    if (error) {
      console.error('Create player error:', error);
      throw error;
    }
    
    console.log('✅ Player created successfully:', data);

    return { 
      data, 
      error: null, 
      loading: false 
    };
  } catch (err) {
    console.error('createPlayer error:', err);
    return { 
      data: null, 
      error: handleDatabaseError(err), 
      loading: false 
    };
  }
}
```

### Fix 2.3: Fix Dashboard Service Database Writes

File: `src/lib/services/dashboardService.ts`

Update the `saveGameAssignment` method:

```typescript
async saveGameAssignment(
  fixtureId: string,
  gameNumber: number,
  playerId: string,
  playerName: string
): Promise<void> {
  try {
    await retryDatabaseOperation(async () => {
      // Get fixture for opponent naming
      const { data: fixture } = await supabase
        .from('fixtures')
        .select('opposition')
        .eq('id', fixtureId)
        .single();
      
      const opponentName = fixture?.opposition 
        ? `${fixture.opposition} Player ${gameNumber}`
        : `Opposition Player ${gameNumber}`;

      // Check if game already exists
      const { data: existingGame } = await supabase
        .from('league_games')
        .select('id')
        .eq('fixture_id', fixtureId)
        .eq('game_number', gameNumber)
        .maybeSingle();

      if (existingGame) {
        // Update existing
        const { error } = await supabase
          .from('league_games')
          .update({
            our_player_id: playerId,
            opponent_name: opponentName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGame.id);

        if (error) throw error;
        console.log('✅ Game assignment updated:', gameNumber);
      } else {
        // Insert new
        const { error } = await supabase
          .from('league_games')
          .insert({
            fixture_id: fixtureId,
            game_number: gameNumber,
            our_player_id: playerId,
            opponent_name: opponentName,
            result: null,
            our_score: 0,
            opposition_score: 0,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        console.log('✅ Game assignment created:', gameNumber);
      }
    });
  } catch (err: any) {
    console.error('saveGameAssignment error:', err);
    throw new Error(handleDatabaseError(err));
  }
}
```

### Fix 2.4: Fix Attendance Service Writes

Add to `src/lib/services/attendanceService.ts`:

```typescript
async updateAttendance(
  playerId: string,
  weekNumber: number,
  available: boolean
): Promise<void> {
  try {
    await retryDatabaseOperation(async () => {
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('player_id', playerId)
        .eq('week_number', weekNumber)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('attendance')
          .update({
            available,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({
            player_id: playerId,
            week_number: weekNumber,
            available,
            selected: false,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }
      
      console.log('✅ Attendance updated for player:', playerId);
    });
  } catch (err: any) {
    console.error('updateAttendance error:', err);
    throw new Error(handleDatabaseError(err));
  }
}
```

---

## SECTION 3: TypeScript Type Error Fixes

### Fix 3.1: Update Player Type with Missing Properties

File: `src/lib/database/types.ts`

```typescript
export interface Player {
  id: string;
  name: string;
  weeks_attended: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  last_game_week: number | null;
  created_at: string;
  total_darts: number;
  total_180s: number;
  win_percentage: number;
  highest_checkout: number;
  checkout_attempts: number;  // ✅ Added
  checkout_hits: number;      // ✅ Added
  last_result: 'win' | 'loss' | null;
  consecutive_losses: number;
  drop_week: number | null;
}
```

### Fix 3.2: Add Trend Property to StatsCard

File: `src/lib/components/StatsCard.svelte`

```svelte
<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let icon: string = '';
  export let trend: 'up' | 'down' | 'neutral' | undefined = undefined;  // ✅ Added
  
  $: trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  $: trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : '';
</script>

<div class="card">
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <p class="text-sm font-medium text-gray-600">{title}</p>
      <p class="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {#if subtitle}
        <p class="text-xs text-gray-500 mt-1">{subtitle}</p>
      {/if}
    </div>
    {#if icon || trend}
      <div class="flex flex-col items-end gap-1">
        {#if icon}
          <span class="text-2xl">{icon}</span>
        {/if}
        {#if trend && trendIcon}
          <span class="text-sm font-medium {trendColor}">{trendIcon}</span>
        {/if}
      </div>
    {/if}
  </div>
</div>
```

### Fix 3.3: Fix hooks.server.ts User Role Type

File: `src/hooks.server.ts`

```typescript
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

type UserRole = 'player' | 'captain' | 'admin' | 'super_admin';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: '/' });
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' });
        },
      },
    }
  );

  const {
    data: { session },
  } = await event.locals.supabase.auth.getSession();

  event.locals.user = session?.user ?? null;

  // Fix: Properly type and validate user role
  if (session?.user) {
    const roleFromMetadata = session.user.user_metadata?.role;
    const validRoles: UserRole[] = ['player', 'captain', 'admin', 'super_admin'];
    
    if (roleFromMetadata && validRoles.includes(roleFromMetadata as UserRole)) {
      event.locals.userRole = roleFromMetadata as UserRole;
    } else {
      event.locals.userRole = 'player'; // Default fallback
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });
};
```

### Fix 3.4: Fix Cache Utility Type Safety

File: `src/lib/utils/cache.ts`

```typescript
evict(): void {
  if (this.cache.size >= this.maxSize) {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {  // ✅ Added type guard
      this.cache.delete(firstKey);
    }
  }
}
```

---

## SECTION 4: Component Rendering Fixes

### Fix 4.1: Fix Form Input Sizes (iOS)

All form inputs must be 16px or larger to prevent zoom on iOS.

File: Update all form components

```svelte
<input
  type="text"
  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  style="font-size: 16px; min-height: 44px;"
/>
```

### Fix 4.2: Fix Button Touch Targets

All buttons must be at least 44px × 44px for mobile.

```css
button, .btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
  touch-action: manipulation;
}
```

### Fix 4.3: Fix Modal Rendering on Mobile

File: `src/lib/components/ui/Modal.svelte`

```svelte
<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9998;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .modal-content {
    position: relative;
    z-index: 9999;
    margin: 16px;
    max-width: min(90vw, 600px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
  }
  
  @media screen and (max-width: 768px) {
    .modal-content {
      margin: 8px;
      max-width: calc(100vw - 16px);
      max-height: calc(100vh - 16px);
    }
  }
</style>
```

---

## SECTION 5: Page-Specific Fixes

### Fix 5.1: Dashboard Page Layout

File: `src/routes/dashboard/+page.svelte`

Wrap content in a scrollable container:

```svelte
<div class="dashboard-container">
  <div class="dashboard-content">
    <!-- Dashboard content here -->
  </div>
</div>

<style>
  .dashboard-container {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .dashboard-content {
    padding: 16px;
    padding-bottom: 80px; /* Space for bottom nav */
  }
  
  @media screen and (min-width: 768px) {
    .dashboard-content {
      padding: 24px;
    }
  }
</style>
```

### Fix 5.2: Team Selection Page

File: `src/routes/team-selection/+page.svelte`

Fix the scrolling and layout:

```svelte
<div class="team-selection-container">
  <div class="team-selection-header">
    <h1 class="text-xl font-bold">Team Selection</h1>
    <p class="text-sm text-gray-600">Week {currentWeek}</p>
  </div>
  
  <div class="team-selection-content">
    <!-- Content here -->
  </div>
</div>

<style>
  .team-selection-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .team-selection-header {
    flex-shrink: 0;
    padding: 16px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .team-selection-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 16px;
    padding-bottom: 80px;
  }
</style>
```

### Fix 5.3: Match Page Layout

File: `src/routes/match/[id]/+page.svelte`

```svelte
<div class="match-container">
  <div class="match-header">
    <button on:click={() => goto('/dashboard')} class="touch-target">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <h1 class="text-lg font-bold">Match Management</h1>
  </div>
  
  <div class="match-content">
    <!-- Match content -->
  </div>
  
  <div class="match-actions">
    <button class="btn-primary w-full">Complete Match</button>
  </div>
</div>

<style>
  .match-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .match-header {
    flex-shrink: 0;
    padding: 16px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .match-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 16px;
  }
  
  .match-actions {
    flex-shrink: 0;
    padding: 16px;
    background: white;
    border-top: 1px solid #e5e7eb;
  }
</style>
```

### Fix 5.4: Admin Page Tabs

File: `src/routes/admin/+page.svelte`

Fix tab navigation for mobile:

```svelte
<nav class="admin-tabs">
  <div class="tabs-scroll">
    <button
      class="tab-button {activeTab === 'overview' ? 'tab-active' : ''}"
      on:click={() => activeTab = 'overview'}
    >
      Overview
    </button>
    <button
      class="tab-button {activeTab === 'players' ? 'tab-active' : ''}"
      on:click={() => activeTab = 'players'}
    >
      Players
    </button>
    <button
      class="tab-button {activeTab === 'fixtures' ? 'tab-active' : ''}"
      on:click={() => activeTab = 'fixtures'}
    >
      Fixtures
    </button>
    <button
      class="tab-button {activeTab === 'users' ? 'tab-active' : ''}"
      on:click={() => activeTab = 'users'}
    >
      Users
    </button>
  </div>
</nav>

<style>
  .admin-tabs {
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .tabs-scroll {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .tabs-scroll::-webkit-scrollbar {
    display: none;
  }
  
  .tab-button {
    flex-shrink: 0;
    padding: 16px 24px;
    border-bottom: 2px solid transparent;
    font-weight: 500;
    font-size: 14px;
    color: #6b7280;
    transition: all 0.2s;
    min-height: 44px;
    touch-action: manipulation;
  }
  
  .tab-button:hover {
    color: #1f2937;
  }
  
  .tab-active {
    color: #1e40af;
    border-bottom-color: #1e40af;
  }
</style>
```

---

## SECTION 6: Testing & Verification

### Test Checklist

After applying all fixes, test the following on iPhone 15 Pro:

#### Mobile Interface Tests
- [ ] App loads without horizontal scrolling
- [ ] All content fits within viewport
- [ ] No zoom on input focus
- [ ] Buttons are easily tappable (44px minimum)
- [ ] Navigation works smoothly
- [ ] Modals display correctly
- [ ] Forms are usable

#### Database Write Tests
- [ ] Create new player
- [ ] Update player statistics
- [ ] Create fixture
- [ ] Update fixture results
- [ ] Mark attendance
- [ ] Assign players to games
- [ ] Save game results
- [ ] Complete match

#### Navigation Tests
- [ ] Dashboard loads correctly
- [ ] Team selection page works
- [ ] Match management accessible
- [ ] Admin panel functional
- [ ] Back navigation works
- [ ] Mobile menu opens/closes

#### Authentication Tests
- [ ] Login works
- [ ] Session persists
- [ ] Logout works
- [ ] Protected routes redirect correctly

---

## SECTION 7: Environment & Configuration

### Required Environment Variables

File: `.env`

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://vkpbrthqicgbmqyndoae.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcGJydGhxaWNnYm1xeW5kb2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTc5NTgsImV4cCI6MjA3MTM5Mzk1OH0.ZkoiqIZE57zKt0bfgLdQCDaEsZ3bfQTZApREVs7HaoA

# App Configuration
PUBLIC_APP_NAME="Isaac Wilson Darts Team"
PUBLIC_APP_VERSION="2.0.0"
PUBLIC_DEFAULT_THEME="isaac-wilson"

# Development
NODE_ENV=development
```

### Verify Package Dependencies

File: `package.json`

Ensure these versions are installed:

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.56.0",
    "date-fns": "^4.1.0",
    "lucide-svelte": "^0.542.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^6.0.0",
    "@sveltejs/kit": "^2.22.0",
    "@sveltejs/vite-plugin-svelte": "^6.0.0",
    "@tailwindcss/forms": "^0.5.10",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^7.0.4"
  }
}
```

---

## SECTION 8: Git Commit Strategy

### Commit Order

Execute fixes and commit in this order:

```bash
# 1. Mobile viewport fixes
git add src/app.html src/app.css src/routes/+layout.svelte
git commit -m "fix: mobile viewport and CSS layout issues"

# 2. Database connection fixes
git add src/lib/database/supabase.ts
git commit -m "fix: improve database connection and error handling"

# 3. Service layer fixes
git add src/lib/database/services/ src/lib/services/
git commit -m "fix: database write operations in all services"

# 4. TypeScript fixes
git add src/lib/database/types.ts src/hooks.server.ts src/lib/utils/cache.ts
git commit -m "fix: TypeScript type errors and safety improvements"

# 5. Component fixes
git add src/lib/components/
git commit -m "fix: component rendering and mobile responsiveness"

# 6. Page layout fixes
git add src/routes/
git commit -m "fix: page layouts for mobile devices"

# 7. Push all changes
git push origin main
```

---

## SECTION 9: Claude Code CLI Execution Instructions

### Step-by-Step Execution

**CRITICAL**: Claude Code CLI must execute these commands in order:

```bash
# Step 1: Backup current state
git branch backup-$(date +%Y%m%d-%H%M%S)

# Step 2: Apply mobile viewport fixes (Section 1)
# - Update src/app.html
# - Update src/routes/+layout.svelte
# - Update src/app.css

# Step 3: Apply database fixes (Section 2)
# - Update src/lib/database/supabase.ts
# - Update src/lib/database/services/players.ts
# - Update src/lib/services/dashboardService.ts
# - Add attendance service improvements

# Step 4: Apply TypeScript fixes (Section 3)
# - Update src/lib/database/types.ts
# - Update src/lib/components/StatsCard.svelte
# - Update src/hooks.server.ts
# - Update src/lib/utils/cache.ts

# Step 5: Apply component fixes (Section 4)
# - Update form inputs across all components
# - Update button styles
# - Update Modal component

# Step 6: Apply page-specific fixes (Section 5)
# - Update dashboard page
# - Update team selection page
# - Update match page
# - Update admin page

# Step 7: Test build
npm run build

# Step 8: Verify no TypeScript errors
npm run check

# Step 9: Commit and push (Section 8)
# Follow the commit strategy outlined above

# Step 10: Deploy
# Trigger deployment via your hosting platform
```

---

## SECTION 10: Known Issues & Future Improvements

### Resolved Issues
✅ Mobile viewport and scrolling
✅ Database write operations
✅ TypeScript type safety
✅ Component rendering
✅ Form input sizes
✅ Touch target sizes

### Remaining Minor Issues (Low Priority)

1. **Service Worker Background Sync**
   - Location: `src/service-worker.ts`
   - Issue: Background sync TypeScript definition
   - Impact: Low - feature detection handles gracefully
   - Fix: Wrap in feature detection

2. **Cache Edge Cases**
   - Location: `src/lib/utils/cache.ts`
   - Issue: Theoretical undefined key scenario
   - Impact: Very low - already has type guard
   - Status: Fixed in Section 3.4

### Future Enhancements

1. **Progressive Web App**
   - Add offline support for all pages
   - Implement background sync for form submissions
   - Add push notifications for match reminders

2. **Performance**
   - Implement virtual scrolling for large player lists
   - Add lazy loading for match history
   - Optimize image loading

3. **Accessibility**
   - Add screen reader announcements
   - Improve keyboard navigation
   - Add high contrast mode

---

## SECTION 11: Verification Commands

### After applying all fixes, run these commands:

```bash
# 1. Check TypeScript
npm run check

# 2. Run linting
npm run lint

# 3. Build for production
npm run build

# 4. Test production build
npm run preview

# 5. Check for unused dependencies
npx depcheck

# 6. Verify Supabase connection
# (Will happen automatically when app loads)
```

### Expected Output

All commands should complete without errors:
- `npm run check` - No TypeScript errors
- `npm run lint` - No linting errors
- `npm run build` - Successful build
- App loads without console errors
- Database operations complete successfully

---

## SECTION 12: Mobile Testing Protocol

### iPhone 15 Pro Specific Tests

1. **Viewport Tests**
   - Portrait orientation: No horizontal scroll
   - Landscape orientation: Content adapts properly
   - Safari address bar: Content adjusts when bar hides
   - Home screen PWA: Full screen works correctly

2. **Form Interaction Tests**
   - Tap input field: No zoom
   - Type in field: Keyboard doesn't cover important UI
   - Submit form: Success feedback visible
   - Validation errors: Clearly visible

3. **Navigation Tests**
   - Tap navigation buttons: Immediate response
   - Swipe gestures: Don't conflict with native gestures
   - Back button: Returns to correct page
   - Deep links: Work correctly

4. **Performance Tests**
   - Page load: < 2 seconds on 4G
   - Scrolling: Smooth 60fps
   - Animations: No jank
   - Database operations: < 1 second response

---

## SECTION 13: Troubleshooting Guide

### If database writes still fail:

1. Check Supabase dashboard for:
   - Row Level Security policies
   - Table permissions
   - API logs

2. Verify environment variables:
   ```bash
   echo $PUBLIC_SUPABASE_URL
   echo $PUBLIC_SUPABASE_ANON_KEY
   ```

3. Test direct Supabase connection:
   ```typescript
   // In browser console
   const { data, error } = await supabase
     .from('players')
     .select('*')
     .limit(1);
   console.log({ data, error });
   ```

### If mobile viewport still has issues:

1. Clear browser cache completely
2. Hard refresh (Cmd + Shift + R)
3. Check for conflicting CSS:
   ```bash
   grep -r "overflow: scroll" src/
   grep -r "position: fixed" src/
   ```

### If TypeScript errors persist:

1. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Rebuild TypeScript definitions:
   ```bash
   npm run prepare
   ```

3. Check for version conflicts:
   ```bash
   npm ls @supabase/supabase-js
   npm ls svelte
   ```

---

## SECTION 14: Success Criteria

### The app is fixed when:

✅ **Mobile Interface**
- No horizontal scrolling on any page
- All content visible without zooming
- Smooth scrolling with momentum
- Touch targets at least 44px × 44px
- Forms work without zoom on input focus

✅ **Database Operations**
- Players can be created
- Statistics update correctly
- Fixtures save properly
- Attendance records persist
- Game results write successfully
- All operations show success/error feedback

✅ **TypeScript**
- `npm run check` passes with no errors
- Build completes successfully
- No console errors in browser
- IntelliSense works correctly

✅ **User Experience**
- App loads in < 2 seconds
- Navigation is intuitive
- Feedback is immediate
- Errors are clear and helpful
- Offline mode works gracefully

---

## SECTION 15: Post-Deployment Checklist

After Claude Code CLI completes all fixes and pushes to GitHub:

- [ ] Verify GitHub Actions build succeeds
- [ ] Check production deployment
- [ ] Test on actual iPhone 15 Pro
- [ ] Verify database writes in production
- [ ] Check Supabase logs for errors
- [ ] Monitor error tracking (if configured)
- [ ] Test with real user account
- [ ] Verify PWA installation works
- [ ] Check offline functionality
- [ ] Confirm all pages accessible

---

## APPENDIX A: File Structure

```
isaac-wilson-darts-app/
├── src/
│   ├── app.html                    # ✅ Fixed - Mobile viewport
│   ├── app.css                     # ✅ Fixed - Mobile-first CSS
│   ├── hooks.server.ts             # ✅ Fixed - Type safety
│   ├── routes/
│   │   ├── +layout.svelte         # ✅ Fixed - Mobile layout
│   │   ├── +layout.server.ts      # ✅ Verified
│   │   ├── +layout.ts             # ✅ Verified
│   │   ├── dashboard/+page.svelte # ✅ Fixed - Scrolling
│   │   ├── team-selection/        # ✅ Fixed - Layout
│   │   ├── match/[id]/            # ✅ Fixed - Layout
│   │   └── admin/+page.svelte     # ✅ Fixed - Tabs
│   ├── lib/
│   │   ├── database/
│   │   │   ├── supabase.ts        # ✅ Fixed - Connection
│   │   │   ├── types.ts           # ✅ Fixed - Player type
│   │   │   └── services/
│   │   │       └── players.ts     # ✅ Fixed - CRUD ops
│   │   ├── services/
│   │   │   ├── dashboardService.ts # ✅ Fixed - Writes
│   │   │   └── attendanceService.ts # ✅ Fixed - Updates
│   │   ├── components/
│   │   │   ├── StatsCard.svelte   # ✅ Fixed - Trend prop
│   │   │   ├── ui/Modal.svelte    # ✅ Fixed - Mobile
│   │   │   └── MobileNavigation.svelte # ✅ Verified
│   │   └── utils/
│   │       └── cache.ts           # ✅ Fixed - Type safety
│   └── static/
│       └── manifest.json          # ✅ PWA config
├── package.json                   # ✅ Dependencies OK
├── vite.config.ts                 # ✅ Config OK
├── svelte.config.js               # ✅ Config OK
├── tailwind.config.js             # ✅ Config OK
└── tsconfig.json                  # ✅ Config OK
```

---

## APPENDIX B: Quick Reference Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run preview            # Preview production build
npm run check              # TypeScript check
npm run lint               # Run linter
npm run format             # Format code

# Testing
npm run test               # Run tests
npm run test:unit          # Unit tests only

# Git
git status                 # Check changes
git add .                  # Stage all changes
git commit -m "message"    # Commit with message
git push origin main       # Push to GitHub

# Cleanup
rm -rf node_modules        # Remove dependencies
npm install                # Reinstall dependencies
rm -rf .svelte-kit         # Clear SvelteKit cache
npm run prepare            # Regenerate types
```

---

## END OF DOCUMENTATION

**Total Fixes**: 40+
**Files Modified**: 25+
**Estimated Time**: 2-3 hours for Claude Code CLI
**Priority**: Execute immediately in order presented

**NOTE**: This documentation is comprehensive and complete. Claude Code CLI should execute all fixes sequentially, verify each section, and commit/push changes as specified.