import { supabase, handleDatabaseError } from '../supabase.js';
import type { LeagueGame, ApiResponse } from '../types.js';

export class GamesService {
  /**
   * Get all games for a specific fixture
   */
  static async getByFixture(fixtureId: string): Promise<ApiResponse<LeagueGame[]>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('*, players(*), fixtures(*)')
        .eq('fixture_id', fixtureId)
        .order('game_order');

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
   * Get all games for a specific player
   */
  static async getByPlayer(playerId: string): Promise<ApiResponse<LeagueGame[]>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('*, fixtures(*)')
        .eq('our_player_id', playerId)
        .order('created_at', { ascending: false });

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
   * Record a new game result
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
        .insert([gameData])
        .select('*, players(*), fixtures(*)')
        .single();

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
   * Update an existing game result
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
        .eq('id', gameId)
        .select('*, players(*), fixtures(*)')
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
   * Delete a game (admin only)
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

  /**
   * Get game statistics for a fixture
   */
  static async getFixtureStats(fixtureId: string): Promise<ApiResponse<{
    totalGames: number;
    gamesWon: number;
    gamesLost: number;
    ourTotalScore: number;
    oppositionTotalScore: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('result, our_score, opposition_score')
        .eq('fixture_id', fixtureId);

      if (error) throw error;

      const games = data || [];
      const stats = {
        totalGames: games.length,
        gamesWon: games.filter(g => g.result === 'win').length,
        gamesLost: games.filter(g => g.result === 'loss').length,
        ourTotalScore: games.reduce((sum, g) => sum + (g.our_score || 0), 0),
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
   * Get recent games across all fixtures (for dashboard)
   */
  static async getRecentGames(limit: number = 10): Promise<ApiResponse<LeagueGame[]>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('*, players(*), fixtures(*)')
        .order('created_at', { ascending: false })
        .limit(limit);

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
   * Check if all games are recorded for a fixture
   */
  static async isFixtureComplete(fixtureId: string, expectedGames: number = 9): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select('id')
        .eq('fixture_id', fixtureId);

      if (error) throw error;

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
