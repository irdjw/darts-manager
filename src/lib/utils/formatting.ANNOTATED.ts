/**
 * ============================================================================
 * FORMATTING.TS — Display Formatting Utilities
 * ============================================================================
 *
 * PURPOSE:
 * Pure functions that turn raw data into display-ready strings. No side
 * effects, no DB calls. Used everywhere a value needs to be shown to the user.
 *
 * DEPENDENCY: date-fns
 * formatDate/formatDateTime use date-fns's format() and parseISO(). date-fns
 * is tree-shakeable — only the imported functions end up in the bundle.
 *
 * ⚠️ DUPLICATE WITH helpers.ts:
 * helpers.ts also exports formatDate() and formatPercentage(). This file's
 * versions use date-fns; helpers.ts uses native toLocaleDateString(). The
 * formatPercentage() logic also differs slightly (see inline notes).
 * Components should be consistent in which file they import from.
 *
 * FUNCTIONS:
 *   formatDate(string|Date)         → "Feb 03, 2026"
 *   formatDateTime(string|Date)     → "Feb 03, 2026 14:30"
 *   getVenueDisplay(venue)          → "🏠 Home" or "✈️ Away"
 *   getVenueText(venue)             → "Home" or "Away" (no emoji)
 *   calculateWinPercentage(w, t)    → whole-number percentage
 *   formatPlayerName(name, short?)  → "John S." or "John Smith"
 *   formatPercentage(n, decimals)   → "75.0%"
 *   getResultBadgeClasses(result)   → Tailwind classes for win/loss/draw badges
 *   getStatusBadgeClasses(status)   → Tailwind classes for fixture status badges
 *   truncateText(text, maxLength)   → "some long te..."
 */

// src/lib/utils/formatting.ts
import { format, parseISO, isValid } from 'date-fns';

// ==========================================================================
// DATE FORMATTING
// ==========================================================================

/**
 * Format a date for display (date only, no time).
 * Accepts either an ISO string ("2026-02-03T...") or a Date object.
 * Returns "Invalid Date" on bad input rather than throwing.
 */
export function formatDate(dateString: string | Date): string {
  try {
    // parseISO handles ISO 8601 strings; if already a Date, pass through
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) {
      return 'Invalid Date';
    }

    // date-fns format tokens: MMM = short month, dd = zero-padded day, yyyy = 4-digit year
    return format(date, 'MMM dd, yyyy');   // e.g. "Feb 03, 2026"
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Same as formatDate but includes 24-hour time.
 * HH = 24-hour hours, mm = minutes.
 */
export function formatDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) {
      return 'Invalid Date';
    }

    return format(date, 'MMM dd, yyyy HH:mm');  // e.g. "Feb 03, 2026 14:30"
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid Date';
  }
}

// ==========================================================================
// VENUE DISPLAY
// ==========================================================================

/** Venue string with emoji — for prominent display. */
export function getVenueDisplay(venue: 'home' | 'away'): string {
  return venue === 'home' ? '🏠 Home' : '✈️ Away';
}

/** Venue string without emoji — for compact or accessible contexts. */
export function getVenueText(venue: 'home' | 'away'): string {
  return venue === 'home' ? 'Home' : 'Away';
}

// ==========================================================================
// NUMERIC FORMATTING
// ==========================================================================

/**
 * Calculate win percentage as a whole number (0–100).
 * Division-by-zero safe: returns 0 when total is 0.
 */
export function calculateWinPercentage(won: number, total: number): number {
  return total > 0 ? Math.round((won / total) * 100) : 0;
}

/**
 * Format a percentage value for display.
 *
 * HANDLES BOTH CONVENTIONS:
 * Some parts of the codebase store percentages as 0–1 (e.g. 0.75).
 * Others store them as 0–100 (e.g. 75). This function detects which:
 *   percentage > 1  →  already 0–100, use as-is
 *   percentage ≤ 1  →  multiply by 100 first
 *
 * ⚠️ Edge case: a value of exactly 1.0 is treated as "0–1 scale" and
 * becomes "100.0%". A value of 1.5 is treated as "0–100 scale" and stays
 * "1.5%". This heuristic breaks for very low percentages (< 1%).
 */
export function formatPercentage(percentage: number, decimals: number = 1): string {
  const percent = percentage > 1 ? percentage : percentage * 100;
  return `${percent.toFixed(decimals)}%`;
}

// ==========================================================================
// PLAYER NAME
// ==========================================================================

/**
 * Format a player name, with an optional short form.
 *
 * short = false (default): "John Smith"  → "John Smith"
 * short = true:            "John Smith"  → "John S."
 *
 * The short form takes the first word and the last initial.
 * Useful for compact UI like leaderboard rows on mobile.
 */
export function formatPlayerName(name: string, short?: boolean): string {
  if (!name || name.trim() === '') {
    return 'Unknown Player';
  }

  if (short && name.includes(' ')) {
    const parts = name.trim().split(' ');
    // First name + last name's first character + "."
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }

  return name.trim();
}

// ==========================================================================
// BADGE CLASSES (Tailwind CSS)
// ==========================================================================

/**
 * Returns Tailwind background + text classes for a result badge.
 * Used on fixture cards and game rows to colour-code outcomes.
 *
 *   win  → green     loss → red      draw → yellow     null → grey
 */
export function getResultBadgeClasses(result: 'win' | 'loss' | 'draw' | null): string {
  switch (result) {
    case 'win':  return 'bg-green-100 text-green-800';
    case 'loss': return 'bg-red-100 text-red-800';
    case 'draw': return 'bg-yellow-100 text-yellow-800';
    default:     return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Returns Tailwind classes for a fixture STATUS badge.
 * Handles multiple string variants of each status (with underscores,
 * hyphens, or different capitalisation) so the UI doesn't break if
 * the DB value format changes slightly.
 */
export function getStatusBadgeClasses(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
    case 'in-progress':                          // Handle both separators
      return 'bg-orange-100 text-orange-800';
    case 'to_play':
    case 'to-play':
    case 'upcoming':                             // Synonym
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ==========================================================================
// TEXT TRUNCATION
// ==========================================================================

/**
 * Truncate long text for mobile display.
 * "Some very long opponent name" → "Some very long oppo..." (at 20 chars)
 * Returns the original string unchanged if it's already short enough.
 */
export function truncateText(text: string, maxLength: number = 20): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
