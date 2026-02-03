/**
 * ============================================================================
 * PLAYERS.TS — Player Database Service
 * ============================================================================
 *
 * PURPOSE:
 * All database operations for the players table. Static methods — no
 * instantiation needed. Every method returns ApiResponse<T> so callers
 * never have to write try/catch themselves.
 *
 * FOUR METHODS:
 *   getAll()              — Full player roster, ordered by name
 *   getAvailablePlayers() — Players available for a specific week
 *                            ⚠️ actually queries attendance, not players
 *   updatePlayerStats()   — Read-modify-write after a game result
 *   createPlayer()        — Admin: add a new player with zeroed stats
 *
 * PATTERNS:
 *   - ApiResponse<T> wrapping: every method catches errors internally and
 *     returns { data, error, loading } — never throws to the caller.
 *   - handleDatabaseError(): translates error codes into strings before
 *     returning (imported from supabase.ts).
 *   - .select().single(): fetches one row. If zero rows match, Supabase
 *     returns error code PGRST116 rather than an empty result.
 *
 * ⚠️ KNOWN ISSUES (documented inline):
 *   1. getAvailablePlayers queries attendance, returns attendance records
 *      typed as Player[] — shape mismatch
 *   2. updatePlayerStats has a drop_week calculation that always sets null
 *   3. win_percentage rounding: Math.round(x * 100) / 100 rounds to 2dp,
 *      but win_percentage is already 0–100 (not 0–1), so the final value
 *      is correct but the intermediate step is confusing
 */

import { supabase, handleDatabaseError } from '../supabase.js';
import type { Player, ApiResponse } from '../types.js';

export class PlayersService {
  // ── getAll ────────────────────────────────────────────────────────────────
  // Returns every player in the database, sorted alphabetically.
  // No league_year filter — players persist across seasons.
  static async getAll(): Promise<ApiResponse<Player[]>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;

      return { data: data || [], error: null, loading: false };
    } catch (err) {
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }

  // ── getAvailablePlayers ───────────────────────────────────────────────────
  // ⚠️ SHAPE MISMATCH: This queries the ATTENDANCE table (not players)
  // and returns rows shaped like { player_id, available, week_number, ... }.
  // The return type says ApiResponse<Player[]> but the actual data is
  // attendance records. Downstream code that accesses .name or .win_percentage
  // on these objects will get undefined.
  //
  // WHAT IT SHOULD DO: Either JOIN players into the attendance query, or
  // query players WHERE id IN (SELECT player_id FROM attendance WHERE ...).
  //
  // .order('name') here orders by a column that doesn't exist on the
  // attendance table — Supabase will likely ignore it or error silently.
  static async getAvailablePlayers(weekNumber: number): Promise<ApiResponse<Player[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('available', true)
        .eq('week_number', weekNumber)
        .order('name');             // ⚠️ 'name' doesn't exist on attendance

      if (error) throw error;

      return { data: data || [], error: null, loading: false };
    } catch (err) {
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }

  // ── updatePlayerStats ─────────────────────────────────────────────────────
  // READ-MODIFY-WRITE pattern:
  //   1. Fetch the player's current row (need current totals to increment)
  //   2. Calculate new values in JS
  //   3. Write the updated row back
  //
  // WHY NOT increment in SQL?
  // Supabase's client SDK doesn't support raw SQL expressions like
  // UPDATE players SET games_played = games_played + 1. The .update()
  // method only accepts literal values. So we fetch first, add in JS,
  // then write back. Race condition possible if two updates run for the
  // same player simultaneously — unlikely in a single-team app.
  //
  // PARAMETERS:
  //   gameResult         — 'win' or 'loss' (no 'draw' — individual games
  //                         don't draw in darts, only fixtures do)
  //   dartsThrown        — total darts in this game
  //   checkoutAttempts   — number of times the player aimed at a double
  //   checkoutHits       — how many of those attempts succeeded
  //   score180s          — number of 180-point turns
  //   highestCheckout    — highest single checkout score (e.g. 170)
  static async updatePlayerStats(
    playerId: string,
    gameResult: 'win' | 'loss',
    dartsThrown: number,
    checkoutAttempts: number = 0,
    checkoutHits: number = 0,
    score180s: number = 0,
    highestCheckout: number = 0
  ): Promise<ApiResponse<Player>> {
    try {
      // STEP 1: Fetch current player data
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (fetchError) throw fetchError;
      if (!player) throw new Error('Player not found');

      // STEP 2: Calculate new values
      const newGamesPlayed = player.games_played + 1;
      const newGamesWon  = gameResult === 'win'  ? player.games_won  + 1 : player.games_won;
      const newGamesLost = gameResult === 'loss' ? player.games_lost + 1 : player.games_lost;

      // win_percentage is stored as 0–100 (e.g. 66.67 means 66.67%)
      const newWinPercentage = newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed) * 100 : 0;

      // Consecutive losses: resets to 0 on a win. On a loss, checks if the
      // PREVIOUS result was also a loss — if so, increments; otherwise starts at 1.
      const newConsecutiveLosses = gameResult === 'loss'
        ? (player.last_result === 'loss' ? player.consecutive_losses + 1 : 1)
        : 0;

      // ⚠️ drop_week is ALWAYS set to null here regardless of consecutive_losses.
      // The comment says "will be set by team selection logic" but that logic
      // (in teamManagement store) also doesn't set it. Drop functionality
      // appears incomplete.
      const newDropWeek = newConsecutiveLosses >= 2 ? null : null;

      // STEP 3: Write updated row back
      const { data, error } = await supabase
        .from('players')
        .update({
          games_played:        newGamesPlayed,
          games_won:           newGamesWon,
          games_lost:          newGamesLost,
          win_percentage:      Math.round(newWinPercentage * 100) / 100,  // Round to 2dp
          total_darts:         player.total_darts + dartsThrown,
          total_180s:          player.total_180s + score180s,
          checkout_attempts:   player.checkout_attempts + checkoutAttempts,
          checkout_hits:       player.checkout_hits + checkoutHits,
          highest_checkout:    Math.max(player.highest_checkout, highestCheckout),
          last_result:         gameResult,
          consecutive_losses:  newConsecutiveLosses,
          drop_week:           newDropWeek
        })
        .eq('id', playerId)
        .select()           // Return the updated row
        .single();

      if (error) throw error;

      return { data, error: null, loading: false };
    } catch (err) {
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }

  // ── createPlayer ──────────────────────────────────────────────────────────
  // Admin-only: adds a brand-new player to the roster.
  // All stat fields start at zero. The player's id and created_at are
  // generated by PostgreSQL (uuid_generate_v4() and now()).
  //
  // .insert([playerData]) — note the array wrapper. Supabase's insert()
  // accepts an array for batch inserts. Single-item arrays work fine.
  static async createPlayer(name: string): Promise<ApiResponse<Player>> {
    try {
      // Client-side validation — fail fast before hitting the DB
      if (!name || name.trim().length === 0) {
        throw new Error('Player name is required');
      }

      // All numeric fields zeroed. Supabase/PostgreSQL will fill id + created_at.
      const playerData = {
        name: name.trim(),
        weeks_attended:     0,
        games_played:       0,
        games_won:          0,
        games_lost:         0,
        win_percentage:     0,
        total_darts:        0,
        total_180s:         0,
        highest_checkout:   0,
        checkout_attempts:  0,
        checkout_hits:      0,
        consecutive_losses: 0,
        last_result:        null,
        drop_week:          null
      };

      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
        .select()       // Return the newly created row (with server-generated id)
        .single();

      if (error) {
        console.error('Create player error:', error);
        throw error;
      }

      console.log('✅ Player created successfully:', data);

      return { data, error: null, loading: false };
    } catch (err) {
      console.error('createPlayer error:', err);
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }
}
