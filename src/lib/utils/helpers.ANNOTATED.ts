/**
 * ============================================================================
 * HELPERS.TS — General-Purpose Utility Functions
 * ============================================================================
 *
 * PURPOSE:
 * A grab-bag of small utilities that don't fit neatly into a single domain.
 * Player stat formatting, team selection recommendations, device detection,
 * debounce, theme management.
 *
 * ⚠️ DEAD CODE AT THE BOTTOM (lines 163–315):
 * There is a large block of commented-out code that is an older copy of
 * the live functions above it. The live versions are SSR-safe (they check
 * `typeof window === 'undefined'` before accessing browser APIs). The dead
 * block does not have these checks. It was left in during a refactor and
 * should be removed.
 *
 * ⚠️ DUPLICATES WITH formatting.ts:
 * formatPercentage() and formatDate() exist in both this file and
 * formatting.ts. This file's formatDate() uses native toLocaleDateString();
 * formatting.ts uses date-fns. Components should pick one and be consistent.
 *
 * FUNCTION GROUPS:
 *   Player stats     — formatPlayerStats, isPlayerAvailable, getPlayerStatus
 *   Team selection   — sortPlayersForSelection, getTeamSelectionRecommendations
 *   Utility          — debounce, formatPercentage, formatDate
 *   Device detection — isMobile, isTouchDevice (SSR-safe)
 *   Theme            — setTheme, getStoredTheme, initializeTheme
 */

import type { Player } from '../database/types.js';

// ==========================================================================
// FORMATTING
// ==========================================================================

/** Format a number with N decimal places and a trailing %. */
export function formatPercentage(value: number, decimals = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Compute derived display stats from a Player object.
 * All calculations are pure — no DB calls, no side effects.
 *
 * Returns:
 *   winPercentage      — "66.7%" (from player.win_percentage)
 *   checkoutPercentage — "45.2%" (hits / attempts × 100)
 *   averageDarts       — whole number (total_darts / games_played)
 *   score180sPerGame   — "2.3" (total_180s / games_played, 1dp)
 */
export function formatPlayerStats(player: Player) {
  return {
    winPercentage: formatPercentage(player.win_percentage),
    checkoutPercentage: player.checkout_attempts > 0
      ? formatPercentage((player.checkout_hits / player.checkout_attempts) * 100)
      : '0.0%',
    averageDarts: player.games_played > 0
      ? Math.round(player.total_darts / player.games_played)
      : 0,
    score180sPerGame: player.games_played > 0
      ? (player.total_180s / player.games_played).toFixed(1)
      : '0.0'
  };
}

// ==========================================================================
// PLAYER STATUS & AVAILABILITY
// ==========================================================================

/**
 * Is this player eligible to play this week?
 * A player is unavailable if their drop_week equals the current week.
 * If drop_week is null (not dropped), they're always available.
 */
export function isPlayerAvailable(player: Player, weekNumber: number): boolean {
  return !player.drop_week || player.drop_week !== weekNumber;
}

/**
 * Three-state status for UI badges:
 *   'available'     — can play, no concerns
 *   'dropped'       — ineligible this week (drop_week matches)
 *   'form_concern'  — eligible but has lost at least once recently
 *
 * Note: form_concern triggers at consecutive_losses >= 1, meaning even a
 * single loss flags the player. The constants file sets
 * consecutiveLossesForDrop = 2, but this check is more aggressive.
 */
export function getPlayerStatus(player: Player, weekNumber: number): 'available' | 'dropped' | 'form_concern' {
  if (!isPlayerAvailable(player, weekNumber)) return 'dropped';
  if (player.consecutive_losses >= 1) return 'form_concern';
  return 'available';
}

// ==========================================================================
// TEAM SELECTION LOGIC
// ==========================================================================

/**
 * Sort players by selection priority:
 *   1. Winners from last week first (last_result === 'win')
 *   2. Highest win_percentage
 *   3. Alphabetical by name (tiebreaker)
 *
 * ⚠️ .sort() mutates the array in place. If you need the original order
 * preserved, pass a copy: sortPlayersForSelection([...players])
 */
export function sortPlayersForSelection(players: Player[]): Player[] {
  return players.sort((a, b) => {
    // Priority 1: last week's winners bubble to the top
    if (a.last_result === 'win' && b.last_result !== 'win') return -1;
    if (b.last_result === 'win' && a.last_result !== 'win') return 1;

    // Priority 2: higher win% first
    if (a.win_percentage !== b.win_percentage) {
      return b.win_percentage - a.win_percentage;
    }

    // Priority 3: alphabetical
    return a.name.localeCompare(b.name);
  });
}

/**
 * TEAM SELECTION RECOMMENDATIONS — the captain's helper.
 *
 * Input: all players + current week number.
 * Output: four buckets + a warnings array.
 *
 * ALGORITHM:
 *   1. Filter out dropped players (drop_week === weekNumber)
 *   2. Sort remaining by selection priority (see sortPlayersForSelection)
 *   3. Auto-select: anyone who WON last week (up to 7)
 *   4. Recommend: fill remaining slots (7 − autoSelected) from the sorted list
 *   5. Warnings: flag form concerns and check if < 7 players available
 *
 * WHY auto-select winners?
 * Darts team selection traditionally rewards players who performed well
 * the previous week. Auto-selecting winners gives the captain a
 * sensible starting point they can override.
 *
 * EDGE CASES:
 *   - More than 7 winners: .slice(0, 7) caps at 7; extras are ignored.
 *   - Fewer than 7 available: warning is generated, team is short.
 *   - Zero players: all arrays are empty, one warning about needing 7.
 */
export interface TeamSelectionRecommendation {
  autoSelected: Player[];   // Winners from last week (up to 7)
  recommended: Player[];    // Best remaining players to fill slots
  available: Player[];      // All eligible players, sorted
  warnings: string[];       // Human-readable warnings for the captain
}

export function getTeamSelectionRecommendations(
  players: Player[],
  weekNumber: number
): TeamSelectionRecommendation {
  // Step 1: only eligible players
  const availablePlayers = players.filter(p => isPlayerAvailable(p, weekNumber));
  // Step 2: sort by priority
  const sortedPlayers = sortPlayersForSelection(availablePlayers);

  // Step 3: auto-select winners (capped at 7)
  const autoSelected = sortedPlayers.filter(p => p.last_result === 'win').slice(0, 7);

  // Step 4: fill remaining slots from non-winners
  const remaining = 7 - autoSelected.length;
  const recommended = sortedPlayers
    .filter(p => p.last_result !== 'win')
    .slice(0, remaining);

  // Step 5: build warnings
  const warnings: string[] = [];

  const formConcerns = recommended.filter(p => p.consecutive_losses >= 1);
  if (formConcerns.length > 0) {
    warnings.push(`${formConcerns.length} player(s) on losing streak: ${formConcerns.map(p => p.name).join(', ')}`);
  }

  if (availablePlayers.length < 7) {
    warnings.push(`Only ${availablePlayers.length} players available (need 7)`);
  }

  return {
    autoSelected,
    recommended,
    available: sortedPlayers,
    warnings
  };
}

// ==========================================================================
// DEBOUNCE
// ==========================================================================

/**
 * Classic debounce: delays invoking func until `delay` ms after the last call.
 * Useful for search inputs — don't hit the DB on every keystroke.
 *
 * Generic <T> preserves the original function's parameter types so
 * TypeScript can type-check the debounced version.
 *
 * ⚠️ ReturnType<typeof setTimeout> is used instead of NodeJS.Timeout.
 * This makes it work in both browser and Node environments.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// ==========================================================================
// DEVICE DETECTION (SSR-SAFE)
// ==========================================================================

/**
 * Returns true if the viewport is mobile-width (≤ 768px).
 * SSR-safe: returns false on the server (no window).
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

/**
 * Returns true if the device supports touch input.
 * Checks both the legacy 'ontouchstart' property and the modern
 * maxTouchPoints API.
 * SSR-safe: returns false on the server.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ==========================================================================
// DATE FORMATTING (native — no date-fns dependency)
// ==========================================================================

/**
 * Format a date using the browser's built-in Intl API.
 *   'short' → "03/02/2026" (locale-dependent, en-GB here)
 *   'long'  → "Tuesday, 3 February 2026"
 *
 * Uses en-GB locale explicitly so the app doesn't depend on the user's
 * system locale for date display.
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return d.toLocaleDateString('en-GB');
}

// ==========================================================================
// THEME MANAGEMENT
// ==========================================================================

/**
 * Set the active theme by writing a data-theme attribute on <html>.
 * CSS can then use [data-theme="isaac-wilson"] selectors to apply colours.
 * Also persists the choice to localStorage so it survives page refresh.
 * SSR-safe: no-ops on the server.
 */
export function setTheme(themeName: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeName);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('darts-theme', themeName);
  }
}

/** Read the persisted theme from localStorage (null if none set). */
export function getStoredTheme(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('darts-theme');
}

/**
 * Call this once on app startup to restore the user's previous theme choice.
 * If nothing is stored, the default theme (from APP_CONFIG) is used by CSS.
 */
export function initializeTheme(): void {
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    setTheme(storedTheme);
  }
}

// ==========================================================================
// ⚠️ DEAD CODE — commented-out duplicate block (lines 163–315 in original)
// ==========================================================================
// The block below this line in the original file is an older copy of all the
// functions above, WITHOUT the SSR-safety checks (typeof window checks).
// It was left in during refactoring. Safe to delete entirely.
//
// The live code above is the correct, SSR-safe version.
