/**
 * ============================================================================
 * CONSTANTS.TS — Application-Wide Configuration Values
 * ============================================================================
 *
 * PURPOSE:
 * Single source of truth for magic numbers and config strings used across
 * the app. If you need to change the team size, touch target size, or
 * performance budget, change it here — not scattered through 20 files.
 *
 * `as const` ON EVERY OBJECT:
 * This makes TypeScript infer the LITERAL types rather than widening.
 * Without it: APP_CONFIG.maxPlayersSelected is typed as `number` (could be anything).
 * With it:    APP_CONFIG.maxPlayersSelected is typed as `7` (exactly 7).
 * Useful when these values are used in comparisons or switch statements.
 *
 * GROUPS:
 *   APP_CONFIG          — Core app settings (team size, breakpoints, perf targets)
 *   TEAM_THEMES         — Colour palettes for multi-team support
 *   USER_ROLES          — Role strings used in auth/permission checks
 *   GAME_RESULTS        — Valid result strings for fixtures/games
 *   VENUES              — 'home' or 'away'
 *   BREAKPOINTS         — Tailwind-compatible responsive breakpoints
 *   PERFORMANCE_BUDGETS — Web Vitals targets for the perf monitoring util
 *
 * KEY VALUES TO KNOW:
 *   maxPlayersSelected = 7    → A darts team has 7 players per fixture
 *   consecutiveLossesForDrop = 2  → Lose twice in a row → flagged for drop
 *   minTouchTarget = 44px     → WCAG AA minimum for touch targets
 */

// ==========================================================================
// APP_CONFIG — Core application settings
// ==========================================================================
export const APP_CONFIG = {
  name: 'Isaac Wilson Darts Team',
  version: '2.0.0',
  description: 'Professional darts team management system',

  // ── Team rules ──────────────────────────────────────────────────────────
  maxPlayersSelected: 7,              // Players per fixture (standard darts team size)
  consecutiveLossesForDrop: 2,        // Consecutive losses before a player is flagged

  // ── Performance targets ─────────────────────────────────────────────────
  targetBundleSize: 800,              // KB — matched by PERFORMANCE_BUDGETS below
  targetLoadTime: 1100,               // ms  — total page load budget

  // ── Multi-team (future) ─────────────────────────────────────────────────
  // The app is architected to support multiple teams (each with its own
  // theme). Currently only 'isaac-wilson' is in use.
  maxTeamsSupported: 20,
  defaultTheme: 'isaac-wilson',

  // ── Mobile / accessibility ──────────────────────────────────────────────
  minTouchTarget: 44,                 // px — WCAG AA touch target minimum
  mobileBreakpoint: 768,              // px — below this = mobile layout
  tabletBreakpoint: 1024              // px — between mobile and desktop
} as const;

// ==========================================================================
// TEAM_THEMES — Colour palettes (multi-team support)
// ==========================================================================
// Each theme has primary, secondary, and accent colours.
// 'isaac-wilson' is the active team. The others are placeholder examples
// for when additional teams are onboarded.
export const TEAM_THEMES = {
  'isaac-wilson': {
    name: 'Isaac Wilson Darts Team',
    primary: '#1e40af',     // Blue (matches Tailwind blue-800)
    secondary: '#10b981',   // Green
    accent: '#f59e0b'       // Amber
  },
  'team-2': {
    name: 'Example Team 2',
    primary: '#dc2626',
    secondary: '#fbbf24',
    accent: '#8b5cf6'
  },
  'team-3': {
    name: 'Example Team 3',
    primary: '#059669',
    secondary: '#06b6d4',
    accent: '#f97316'
  }
} as const;

// ==========================================================================
// USER_ROLES — Permission hierarchy
// ==========================================================================
// Lowest → highest privilege:
//   player → captain → admin → super_admin
// Used in permission checks and role-based route guards.
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CAPTAIN: 'captain',
  PLAYER: 'player'
} as const;

// ==========================================================================
// GAME_RESULTS — Valid outcome strings
// ==========================================================================
// Used when writing fixture results. Individual darts GAMES within a fixture
// are always win/loss (no draws in a single game). The FIXTURE as a whole
// can draw if legs are split evenly.
export const GAME_RESULTS = {
  WIN: 'win',
  LOSS: 'loss',
  DRAW: 'draw'
} as const;

// ==========================================================================
// VENUES — Home/away indicator
// ==========================================================================
export const VENUES = {
  HOME: 'home',
  AWAY: 'away'
} as const;

// ==========================================================================
// BREAKPOINTS — Responsive layout thresholds
// ==========================================================================
// Matches Tailwind's default breakpoints. Used in JS where CSS media queries
// aren't available (e.g. in service workers or server-side logic).
export const BREAKPOINTS = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px'
} as const;

// ==========================================================================
// PERFORMANCE_BUDGETS — Web Vitals targets
// ==========================================================================
// Consumed by performance.ts to flag regressions.
// Values are based on Google's "Good" thresholds for Core Web Vitals.
export const PERFORMANCE_BUDGETS = {
  bundleSize: 800000,              // 800KB total transfer
  loadTime: 1100,                  // 1.1s total page load
  firstContentfulPaint: 800,       // 0.8s FCP (Google "Good" threshold)
  largestContentfulPaint: 1200     // 1.2s LCP
} as const;
