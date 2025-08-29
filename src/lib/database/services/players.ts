import { supabase, handleDatabaseError } from '../supabase.js';
import type { Player, ApiResponse } from '../types.js';

export class PlayersService {
  /**
   * Get all players with statistics
   */
  static async getAll(): Promise<ApiResponse<Player[]>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

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
   * Get available players for team selection (not dropped)
   */
  static async getAvailablePlayers(weekNumber: number): Promise<ApiResponse<Player[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq(`available`, true)
        .eq(`week_number`, weekNumber)
        .order('name');

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
   * Update player statistics after game
   */
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
      // Get current player data
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (fetchError) throw fetchError;
      if (!player) throw new Error('Player not found');

      // Calculate new statistics
      const newGamesPlayed = player.games_played + 1;
      const newGamesWon = gameResult === 'win' ? player.games_won + 1 : player.games_won;
      const newGamesLost = gameResult === 'loss' ? player.games_lost + 1 : player.games_lost;
      const newWinPercentage = newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed) * 100 : 0;
      
      const newConsecutiveLosses = gameResult === 'loss' 
        ? (player.last_result === 'loss' ? player.consecutive_losses + 1 : 1)
        : 0;

      const newDropWeek = newConsecutiveLosses >= 2 ? null : null; // Will be set by team selection logic

      const { data, error } = await supabase
        .from('players')
        .update({
          games_played: newGamesPlayed,
          games_won: newGamesWon,
          games_lost: newGamesLost,
          win_percentage: Math.round(newWinPercentage * 100) / 100,
          total_darts: player.total_darts + dartsThrown,
          total_180s: player.total_180s + score180s,
          checkout_attempts: player.checkout_attempts + checkoutAttempts,
          checkout_hits: player.checkout_hits + checkoutHits,
          highest_checkout: Math.max(player.highest_checkout, highestCheckout),
          last_result: gameResult,
          consecutive_losses: newConsecutiveLosses,
          drop_week: newDropWeek
        })
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;

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
   * Add new player (admin only)
   */
  static async createPlayer(name: string): Promise<ApiResponse<Player>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;

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
}