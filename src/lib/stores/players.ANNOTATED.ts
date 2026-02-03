/**
 * ============================================================================
 * PLAYERS.TS — Player Data Store
 * ============================================================================
 *
 * PURPOSE:
 * Central cache for player data. Components that need the player list
 * (team selection, statistics, admin panels) subscribe here instead of
 * each running their own DB query. The store also exposes filtered/sorted
 * "views" via derived stores.
 *
 * ARCHITECTURE:
 *   PlayersService (static DB methods)
 *         ↓  called by
 *   createPlayersStore()              ← this file
 *         ↓  subscribed to by
 *   Components, derived stores
 *
 * STATE SHAPE:
 *   players[]    — the full list (or filtered subset, depending on which
 *                  load method was called last)
 *   loading      — true while a DB fetch is in progress
 *   error        — human-readable error string, or null
 *   lastUpdated  — Date of the most recent successful load (useful for
 *                  "stale data" indicators or manual refresh logic)
 *
 * KEY PATTERNS:
 *
 *   1. ApiResponse<T> HANDLING:
 *      PlayersService returns { data, error, loading } rather than throwing.
 *      The store checks response.error before updating state. This keeps
 *      try/catch out of the store — the service handles error translation.
 *
 *   2. LOCAL MUTATIONS (updatePlayer / addPlayer):
 *      After a DB write succeeds, the calling component updates the store
 *      locally rather than re-fetching the entire list. This avoids a
 *      round-trip and keeps the UI snappy. The store's .map() replaces
 *      exactly one item by id.
 *
 *   3. DERIVED STORES:
 *      availablePlayers, topPerformers, playersLoading, playersError are
 *      computed automatically whenever the base store changes. No manual
 *      recalculation needed.
 *
 * ⚠️ NOTES:
 *   - availablePlayers filters on !player.drop_week. This means ANY player
 *     with a non-null drop_week is excluded — even if the current week is
 *     different. The filter should probably compare drop_week to the current
 *     week number for correctness.
 *   - getAvailablePlayers(weekNumber) queries the ATTENDANCE table, not
 *     players — so the returned data shape is an attendance record, not a
 *     Player. The store types this as Player[] regardless. See
 *     PlayersService.getAvailablePlayers for details.
 */

import { writable, derived } from 'svelte/store';
import { PlayersService } from '../database/services/players.js';
import type { Player } from '../database/types.js';

// ==========================================================================
// STATE SHAPE
// ==========================================================================

interface PlayersState {
  players: Player[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;   // When the data was last fetched from DB
}

// ==========================================================================
// STORE FACTORY
// ==========================================================================

function createPlayersStore() {
  const { subscribe, set, update } = writable<PlayersState>({
    players: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  return {
    subscribe,

    // ── loadPlayers ─────────────────────────────────────────────────────
    // Fetches ALL players (active and inactive), ordered by name.
    // Used by admin panels and the full player roster views.
    loadPlayers: async () => {
      update(state => ({ ...state, loading: true, error: null }));

      const response = await PlayersService.getAll();

      if (response.error) {
        // response.error is already a human-readable string (from handleDatabaseError)
        update(state => ({
          ...state,
          loading: false,
          error: response.error || 'Failed to load players'
        }));
      } else {
        update(state => ({
          ...state,
          players: response.data || [],
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      }
    },

    // ── loadAvailablePlayers ────────────────────────────────────────────
    // Fetches players who marked themselves available for a specific week.
    //
    // ⚠️ TYPE MISMATCH: PlayersService.getAvailablePlayers queries the
    // attendance table and returns attendance records (player_id, available,
    // selected, etc.) — NOT Player objects. But this store types the result
    // as Player[]. Components downstream may access fields (name, win_percentage)
    // that don't exist on the returned data.
    loadAvailablePlayers: async (weekNumber: number) => {
      update(state => ({ ...state, loading: true, error: null }));

      const response = await PlayersService.getAvailablePlayers(weekNumber);

      if (response.error) {
        update(state => ({
          ...state,
          loading: false,
          // response.error here is an object from handleDatabaseError — coerce to string
          error: response.error?.message || 'Failed to load available players'
        }));
      } else {
        update(state => ({
          ...state,
          players: response.data || [],
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      }
    },

    // ── updatePlayer ────────────────────────────────────────────────────
    // Replace one player in the local array after an admin edit or stat
    // update. No DB call — the caller already persisted the change.
    // .map() returns a NEW array (immutable update), which triggers
    // Svelte reactivity.
    updatePlayer: (updatedPlayer: Player) => {
      update(state => ({
        ...state,
        players: state.players.map(p =>
          p.id === updatedPlayer.id ? updatedPlayer : p
        ),
        lastUpdated: new Date()
      }));
    },

    // ── addPlayer ───────────────────────────────────────────────────────
    // Append a newly created player to the local list. Again, the DB
    // insert already happened — this just keeps the UI in sync.
    addPlayer: (newPlayer: Player) => {
      update(state => ({
        ...state,
        players: [...state.players, newPlayer],
        lastUpdated: new Date()
      }));
    },

    // ── clearError ──────────────────────────────────────────────────────
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

// ==========================================================================
// EXPORTS
// ==========================================================================

export const players = createPlayersStore();

// ── Derived stores ────────────────────────────────────────────────────────
// These recompute automatically whenever $players changes.

// Players who are NOT on a drop_week.
// ⚠️ See note above: this filters on ANY non-null drop_week, not just
// the current week.
export const availablePlayers = derived(
  players,
  $players => $players.players.filter(p => !p.drop_week)
);

// Top 5 players by win percentage, minimum 5 games played.
// The games_played filter prevents new players with 1 win from
// appearing at the top of the leaderboard.
export const topPerformers = derived(
  players,
  $players => $players.players
    .filter(p => p.games_played >= 5)
    .sort((a, b) => b.win_percentage - a.win_percentage)
    .slice(0, 5)
);

// Convenience single-value derived stores for conditional rendering:
//   {#if $playersLoading} <Spinner /> {/if}
export const playersLoading = derived(players, $players => $players.loading);
export const playersError   = derived(players, $players => $players.error);
