/**
 * ============================================================================
 * APP.D.TS — Global Type Declarations
 * ============================================================================
 *
 * PURPOSE:
 * Augments SvelteKit's built-in App namespace with the types specific to
 * this project. Every interface declared here is available globally —
 * no import needed. This is also the single place that re-exports all
 * commonly used types so components can write:
 *   import type { Player } from 'app';   (or just use the global namespace)
 *
 * WHY DOES THIS FILE EXIST?
 * SvelteKit defines App.PageData, App.Locals, etc. as empty interfaces.
 * This file "merges" our custom fields into those interfaces via TypeScript's
 * declaration merging. The compiler sees both the SvelteKit defaults and
 * our extensions as one unified type.
 *
 * SECTIONS:
 *   1. App.Error      — shape of errors propagated to +error.svelte
 *   2. App.Locals     — data attached to the request in hooks.server.ts
 *   3. App.PageData   — data returned by load() functions and passed to pages
 *   4. App.Platform   — environment variables available on the server
 *   5. svelte.JSX     — custom event types for Svelte component attributes
 *   6. Re-exports     — convenience barrel for all project types
 *   7. Global consts  — APP_VERSION, BUILD_TIME (injected at build time)
 *
 * IMPORT MAP (where each type originally lives):
 *   Player, Fixture, Attendance, LeagueGame, WarmupSession, ApiResponse,
 *     PaginatedResponse, AuthUser, UserRole  →  $lib/database/types
 *   DartThrow, TurnData, LegData, GameState, PlayerGameStats,
 *     CheckoutRoute, CheckoutData, ScoringMode, ScoringEngineProps
 *                                            →  $lib/types/scoring
 *   DashboardStats, TeamSelection, AttendanceRecord
 *                                            →  $lib/types/dashboard
 *   Permission                              →  $lib/utils/permissions
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';

// ── Database types ──────────────────────────────────────────────────────────
import type {
  UserRole,
  Player,
  Fixture,
  Attendance,
  LeagueGame,
  WarmupSession,
  ApiResponse,
  PaginatedResponse,
  AuthUser
} from '$lib/database/types';

// ── Scoring types ───────────────────────────────────────────────────────────
import type {
  DartThrow,
  TurnData,
  LegData,
  GameState,
  PlayerGameStats,
  CheckoutRoute,
  CheckoutData,
  ScoringMode,
  ScoringEngineProps
} from '$lib/types/scoring';

// ── Dashboard types ─────────────────────────────────────────────────────────
import type {
  DashboardStats,
  TeamSelection,
  AttendanceRecord
} from '$lib/types/dashboard';

// ── Utility types ───────────────────────────────────────────────────────────
import type { Permission } from '$lib/utils/permissions';

// ==========================================================================
// SVELTEKIT APP NAMESPACE AUGMENTATION
// ==========================================================================

declare global {
  namespace App {
    // ── App.Error ─────────────────────────────────────────────────────────
    // Extends the default Error with an optional error code (e.g. PGRST116)
    // and a details payload. +error.svelte can read these to show context.
    interface Error {
      code?: string;
      message: string;
      details?: any;
    }

    // ── App.Locals ────────────────────────────────────────────────────────
    // Set in hooks.server.ts and available in every server-side load() and
    // +page.server.ts via event.locals.
    //   supabase — the server-side Supabase client (created with cookies)
    //   user     — the authenticated User, or undefined if not logged in
    interface Locals {
      supabase: SupabaseClient;
      user?: User;
    }

    // ── App.PageData ──────────────────────────────────────────────────────
    // The return type of load() functions. Fields here are passed as props
    // to +page.svelte via the special `data` prop:
    //   export let data;   // typed as App.PageData
    //
    // session & user are ALWAYS present (populated by the root layout).
    // The optional fields (players, fixtures, etc.) are populated by
    // individual page load() functions when needed.
    interface PageData {
      session: import('@supabase/supabase-js').Session | null;
      user: User | null;
      players?: Player[];
      fixtures?: Fixture[];
      attendance?: AttendanceRecord[];
      dashboardStats?: DashboardStats;
    }

    // ── App.Platform ──────────────────────────────────────────────────────
    // Server-side environment. On Cloudflare/Vercel these come from the
    // platform's env config; locally they come from .env files.
    // SERVICE_ROLE_KEY is optional because it's only needed for admin
    // operations (bypasses RLS) and should never be exposed client-side.
    interface Platform {
      env?: {
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
      };
    }
  }

  // ── Custom Svelte JSX attributes ────────────────────────────────────────
  // Allows components to use on:click_outside and on:long_press in
  // templates without TypeScript errors. The actual logic is implemented
  // as Svelte actions elsewhere in the codebase.
  namespace svelte.JSX {
    interface HTMLAttributes<T> {
      'on:click_outside'?: (event: CustomEvent) => void;
      'on:long_press'?: (event: CustomEvent) => void;
    }
  }

  // ── Build-time globals ──────────────────────────────────────────────────
  // Injected by the bundler (vite.config.ts define plugin).
  // Available anywhere without import — useful for version banners or
  // cache-busting.
  const APP_VERSION: string;
  const BUILD_TIME: string;
}

// ==========================================================================
// RE-EXPORTS — Barrel file for convenient imports
// ==========================================================================
// Instead of deep imports like:
//   import type { Player } from '$lib/database/types';
// Components can write:
//   import type { Player } from 'app';
// (depending on tsconfig paths)

export type {
  // Database types
  Player,
  Fixture,
  Attendance,
  LeagueGame,
  UserRole,
  WarmupSession,
  AuthUser,

  // Scoring types
  DartThrow,
  TurnData,
  LegData,
  GameState,
  PlayerGameStats,
  CheckoutRoute,
  CheckoutData,
  ScoringMode,
  ScoringEngineProps,

  // Dashboard types
  DashboardStats,
  TeamSelection,
  AttendanceRecord,

  // API types
  ApiResponse,
  PaginatedResponse,

  // Utility types
  Permission
};

// Required for TypeScript to treat this as a module (not a script).
// Without it, the global declarations above would not be visible.
export {};
