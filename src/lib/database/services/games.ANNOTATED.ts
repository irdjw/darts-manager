/**
 * ============================================================================
 * GAMES SERVICE - Database CRUD for League Game Results
 * ============================================================================
 *
 * PURPOSE:
 * Handles all database operations for individual game results within a fixture.
 * A "game" here is a single 501 darts match between two players — one from our
 * team and one from the opposition. A full fixture (team match) typically
 * consists of 9 individual games.
 *
 * WHAT IS A "GAME" IN THIS CONTEXT?
 * In darts league matches:
 * - A FIXTURE is an entire team match (e.g., "Our Team vs Rivals")
 * - A GAME is one individual match within that fixture
 * - Each game has one of our players vs one opposition player
 * - A fixture has up to 9 games, each with a game_order (1-9)
 * - The team with more wins across the 9 games wins the fixture
 *
 * STATIC METHODS:
 * All methods are static — no instance creation needed. Just call:
 *   GamesService.createGame(...)
 *   GamesService.getByFixture(fixtureId)
 *
 * CONSISTENT PATTERN:
 * Every method follows the same try/catch → ApiResponse pattern:
 *   - Success: { data: <result>, error: null, loading: false }
 *   - Failure: { data: null, error: <message>, loading: false }
 * This means callers never need to handle exceptions directly.
 *
 * DATABASE TABLE: league_games
 * COLUMNS: id, fixture_id, our_player_id, opposition_player, result,
 *          our_score, opposition_score, game_order, created_at
 *
 * JOINS:
 * Most queries join players(*) and fixtures(*) so the returned data
 * includes full player and fixture details — not just IDs.
 */

import { supabase, handleDatabaseError } from '../supabase.js';
import type { LeagueGame, ApiResponse } from '../types.js';

export class GamesService {

  // ==========================================================================
  // QUERY METHODS — Read game data from the database
  // ==========================================================================

  /**
   * GET BY FIXTURE — All games in a specific fixture
   *
   * CALLED BY: Match details page, fixture summary, results admin
   *
   * RETURNS: Array of games ordered by game_order (1, 2, 3... 9)
   * This order matters — it determines the sequence games were played.
   *
   * JOINS: players(*) and fixtures(*) give you full related objects.
   *
   * EXAMPLE:
   *   const { data } = await GamesService.getByFixture('fixture-abc');
   *   // data = [
   *   //   { game_order: 1, our_player_id: '...', opposition_player: 'Dave', result: 'win', ... },
   *   //   { game_order: 2, ... },
   *   //   ...up to 9 games
   *   // ]
   */
  static async getByFixture(fixtureId: string): Promise<ApiResponse<LeagueGame[]>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('*, players(*), fixtures(*)')   // Join full player + fixture records
        .eq('fixture_id', fixtureId)            // Filter to this fixture only
        .order('game_order');                    // Sort by play order (1-9)

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * GET BY PLAYER — All games a specific player has played
   *
   * CALLED BY: Player statistics page, personal history
   *
   * RETURNS: Array of games ordered newest-first (descending created_at)
   * This gives a "recent games" chronological view.
   *
   * NOTE: Only joins fixtures(*), not players(*), because we already
   * know the player — we filtered by our_player_id.
   *
   * EXAMPLE:
   *   const { data } = await GamesService.getByPlayer('player-123');
   *   // data[0] = most recent game this player played
   */
  static async getByPlayer(playerId: string): Promise<ApiResponse<LeagueGame[]>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('*, fixtures(*)')                          // Join fixture details
        .eq('our_player_id', playerId)                     // Only this player's games
        .order('created_at', { ascending: false });        // Newest first

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * GET RECENT GAMES — Latest games across ALL fixtures (for dashboard)
   *
   * CALLED BY: Dashboard "recent results" widget
   *
   * PARAMETERS:
   * - limit: How many games to return (default 10). Controls how far back
   *          the dashboard shows results.
   *
   * RETURNS: Array of most recent games, newest first.
   * Includes full player and fixture joins for display purposes.
   */
  static async getRecentGames(limit: number = 10): Promise<ApiResponse<LeagueGame[]>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('*, players(*), fixtures(*)')
        .order('created_at', { ascending: false })   // Newest first
        .limit(limit);                               // Cap results

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // WRITE METHODS — Create or modify game records
  // ==========================================================================

  /**
   * CREATE GAME — Save a new game result after it's played
   *
   * CALLED BY: Scoring page after a 501 game finishes (GameCompleteModal)
   *
   * PARAMETERS:
   * - fixtureId:          Which fixture (team match) this game belongs to
   * - ourPlayerId:        UUID of our team's player (from players table)
   * - oppositionPlayer:   Name string of the opponent (NOT a UUID — opposition
   *                       players aren't in our players table)
   * - result:             'win' or 'loss' — from our player's perspective
   * - ourScore:           Legs won by our player (e.g., 3 in a best-of-5)
   * - oppositionScore:    Legs won by opponent
   * - gameOrder:          Position in fixture (1-9). Determines play sequence.
   *
   * KEY DETAIL — oppositionPlayer is a string, not a UUID:
   * Our players are registered in the players table with UUIDs.
   * Opposition players are typed in manually — just their name.
   * This asymmetry reflects how league darts works: you know your
   * own team roster but opposition names come from a scorecard.
   *
   * RETURNS: The newly created game record with joined player + fixture data.
   *
   * EXAMPLE:
   *   await GamesService.createGame(
   *     'fixture-abc',      // This week's fixture
   *     'player-123',       // John Smith (our player)
   *     'Mike Jones',       // Opposition player name
   *     'win',              // John won
   *     3,                  // Won 3 legs
   *     1,                  // Lost 1 leg
   *     1                   // First game of the fixture
   *   );
   */
  static async createGame(
    fixtureId: string,
    ourPlayerId: string,
    oppositionPlayer: string,
    result: 'win' | 'loss',
    ourScore: number,
    oppositionScore: number,
    gameOrder: number
  ): Promise<ApiResponse<LeagueGame>> {
    try {
      // Build the row to insert — maps parameters to column names
      const gameData = {
        fixture_id: fixtureId,
        our_player_id: ourPlayerId,
        opposition_player: oppositionPlayer,
        result,
        our_score: ourScore,
        opposition_score: oppositionScore,
        game_order: gameOrder
      };

      const { data, error } = await supabase
        .from('league_games')
        .insert([gameData])                        // Insert as array (Supabase convention)
        .select('*, players(*), fixtures(*)')      // Return full record with joins
        .single();                                 // We inserted one row, expect one back

      if (error) {
        console.error('Create game error:', error);
        throw error;
      }

      console.log('✅ Game recorded successfully:', data);

      return {
        data,
        error: null,
        loading: false
      };
    } catch (err) {
      console.error('createGame error:', err);
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * UPDATE GAME — Correct or edit an existing game result
   *
   * CALLED BY: Admin results page (for correcting mistakes)
   *
   * NOTE: Only result and scores can be updated — fixture_id, player,
   * and game_order are immutable once created. If those need changing,
   * delete and recreate the game.
   *
   * PARAMETERS:
   * - gameId:            UUID of the game to update
   * - result:            New result ('win' or 'loss')
   * - ourScore:          Corrected leg count for our player
   * - oppositionScore:   Corrected leg count for opponent
   */
  static async updateGame(
    gameId: string,
    result: 'win' | 'loss',
    ourScore: number,
    oppositionScore: number
  ): Promise<ApiResponse<LeagueGame>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .update({
          result,
          our_score: ourScore,
          opposition_score: oppositionScore
        })
        .eq('id', gameId)                          // Target this specific game
        .select('*, players(*), fixtures(*)')      // Return updated record
        .single();

      if (error) throw error;

      console.log('✅ Game updated successfully:', data);

      return {
        data,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * DELETE GAME — Remove a game record entirely
   *
   * CALLED BY: Admin emergency page only
   *
   * WARNING: This permanently removes the game. No soft-delete.
   * Should only be used by admin when a game was entered in error.
   *
   * RETURNS: true on success (not the deleted record — it's gone).
   */
  static async deleteGame(gameId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('league_games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      console.log('✅ Game deleted successfully');

      return {
        data: true,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // STATISTICS METHODS — Computed summaries from game data
  // ==========================================================================

  /**
   * GET FIXTURE STATS — Summary statistics for all games in a fixture
   *
   * CALLED BY: Match details page (shows "5 wins, 4 losses" scoreboard)
   *
   * HOW IT WORKS:
   * 1. Fetches all games for the fixture (just result + scores, no joins)
   * 2. Computes aggregates client-side using filter/reduce
   *
   * WHY CLIENT-SIDE AGGREGATION?
   * Supabase doesn't easily support GROUP BY / COUNT in its JS client.
   * For 9 games, computing in JS is instant — no performance concern.
   *
   * RETURNS:
   * {
   *   totalGames: 9,              // How many games played so far
   *   gamesWon: 5,                // Our wins
   *   gamesLost: 4,               // Our losses
   *   ourTotalScore: 22,          // Total legs won by our players
   *   oppositionTotalScore: 18    // Total legs won by opposition
   * }
   *
   * NOTE: totalGames may be < 9 if the fixture is still in progress.
   */
  static async getFixtureStats(fixtureId: string): Promise<ApiResponse<{
    totalGames: number;
    gamesWon: number;
    gamesLost: number;
    ourTotalScore: number;
    oppositionTotalScore: number;
  }>> {
    try {
      // Minimal select — only the columns we need for calculation
      const { data, error } = await supabase
        .from('league_games')
        .select('result, our_score, opposition_score')
        .eq('fixture_id', fixtureId);

      if (error) throw error;

      const games = data || [];

      // Client-side aggregation
      const stats = {
        totalGames: games.length,
        gamesWon: games.filter(g => g.result === 'win').length,
        gamesLost: games.filter(g => g.result === 'loss').length,
        // Sum all legs won by our players across all games
        ourTotalScore: games.reduce((sum, g) => sum + (g.our_score || 0), 0),
        // Sum all legs won by opposition across all games
        oppositionTotalScore: games.reduce((sum, g) => sum + (g.opposition_score || 0), 0)
      };

      return {
        data: stats,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * IS FIXTURE COMPLETE — Check if all games have been recorded
   *
   * CALLED BY: Dashboard (shows "results pending" badge), fixture list
   *
   * PARAMETERS:
   * - fixtureId:     The fixture to check
   * - expectedGames: How many games make a complete fixture (default 9)
   *                  League matches are 9 games, but this is configurable
   *                  for formats that use fewer.
   *
   * LOGIC: Simply counts rows. If count >= expectedGames, it's complete.
   * Uses select('id') — we only need to count rows, not read data.
   *
   * RETURNS: true if fixture has all expected games recorded.
   */
  static async isFixtureComplete(fixtureId: string, expectedGames: number = 9): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('id')                   // Minimal select — just counting rows
        .eq('fixture_id', fixtureId);

      if (error) throw error;

      // Compare actual game count to expected
      const isComplete = (data?.length || 0) >= expectedGames;

      return {
        data: isComplete,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }
}
