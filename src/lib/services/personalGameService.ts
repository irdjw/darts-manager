// Personal Game Service for DDP (personal practice) functionality
import { supabase } from '$lib/database/supabase';
import type { PersonalGame, PersonalStats } from '$lib/database/types';
import type { PlayerGameStats } from '$lib/types/scoring';

export class PersonalGameService {
  /**
   * Create a new personal practice game
   */
  async createPersonalGame(playerId: string, opponentName: string): Promise<string> {
    try {
      const gameData = {
        player_id: playerId,
        opponent_name: opponentName,
        game_date: new Date().toISOString().split('T')[0],
        game_won: false,
        legs_played: 0,
        legs_won: 0
      };

      const { data, error } = await supabase
        .from('ddp')
        .insert(gameData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating personal game:', error);
        throw error;
      }

      return data.id;
    } catch (err: any) {
      console.error('createPersonalGame error:', err);
      throw new Error('Failed to create personal game');
    }
  }

  /**
   * Complete a personal game and save statistics
   */
  async completePersonalGame(
    gameId: string, 
    gameWon: boolean, 
    legsPlayed: number, 
    legsWon: number,
    playerStats: PlayerGameStats
  ): Promise<void> {
    try {
      // Update the game result
      const { error: gameError } = await supabase
        .from('ddp')
        .update({
          game_won: gameWon,
          legs_played: legsPlayed,
          legs_won: legsWon
        })
        .eq('id', gameId);

      if (gameError) throw gameError;

      // Get the game details for stats
      const { data: gameData, error: fetchError } = await supabase
        .from('ddp')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;

      // Save detailed statistics
      const statsData = {
        player_id: gameData.player_id,
        player_name: playerStats.playerName,
        game_id: gameId,
        opponent_name: gameData.opponent_name,
        game_won: gameWon,
        legs_played: legsPlayed,
        legs_won: legsWon,
        total_darts: playerStats.totalDarts,
        total_points: playerStats.totalPoints,
        scores_180: playerStats.scores180,
        scores_140_plus: playerStats.scores140Plus,
        scores_100_plus: playerStats.scores100Plus,
        scores_80_plus: playerStats.scores80Plus,
        double_attempts: playerStats.doubleAttempts,
        double_hits: playerStats.doubleHits,
        checkout_attempts: playerStats.checkoutAttempts,
        checkout_hits: playerStats.checkoutHits,
        highest_checkout: playerStats.highestCheckout,
        game_date: gameData.game_date
      };

      const { error: statsError } = await supabase
        .from('dstats')
        .insert(statsData);

      if (statsError) throw statsError;

    } catch (err: any) {
      console.error('completePersonalGame error:', err);
      throw new Error('Failed to complete personal game');
    }
  }

  /**
   * Get personal game history
   */
  async getPersonalGames(playerId: string, limit: number = 50): Promise<PersonalGame[]> {
    try {
      const { data, error } = await supabase
        .from('ddp')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getPersonalGames error:', err);
      throw new Error('Failed to load personal games');
    }
  }

  /**
   * Get personal statistics summary
   */
  async getPersonalStatsSummary(playerId: string): Promise<{
    totalGames: number;
    gamesWon: number;
    winPercentage: number;
    total180s: number;
    highestCheckout: number;
    averageScore: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('dstats')
        .select('*')
        .eq('player_id', playerId);

      if (error) throw error;

      const stats = data || [];
      const totalGames = stats.length;
      const gamesWon = stats.filter(s => s.game_won).length;
      const winPercentage = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;
      const total180s = stats.reduce((sum, s) => sum + (s.scores_180 || 0), 0);
      const highestCheckout = Math.max(...stats.map(s => s.highest_checkout || 0), 0);
      const totalPoints = stats.reduce((sum, s) => sum + (s.total_points || 0), 0);
      const totalDarts = stats.reduce((sum, s) => sum + (s.total_darts || 0), 0);
      const averageScore = totalDarts > 0 ? Math.round((totalPoints / totalDarts) * 100) / 100 : 0;

      return {
        totalGames,
        gamesWon,
        winPercentage,
        total180s,
        highestCheckout,
        averageScore
      };
    } catch (err: any) {
      console.error('getPersonalStatsSummary error:', err);
      throw new Error('Failed to load personal statistics');
    }
  }

  /**
   * Get detailed personal statistics
   */
  async getPersonalStats(playerId: string, limit: number = 50): Promise<PersonalStats[]> {
    try {
      const { data, error } = await supabase
        .from('dstats')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getPersonalStats error:', err);
      throw new Error('Failed to load personal statistics');
    }
  }

  /**
   * Delete a personal game and its statistics
   */
  async deletePersonalGame(gameId: string): Promise<void> {
    try {
      // Delete statistics first
      const { error: statsError } = await supabase
        .from('dstats')
        .delete()
        .eq('game_id', gameId);

      if (statsError) throw statsError;

      // Delete the game
      const { error: gameError } = await supabase
        .from('ddp')
        .delete()
        .eq('id', gameId);

      if (gameError) throw gameError;

    } catch (err: any) {
      console.error('deletePersonalGame error:', err);
      throw new Error('Failed to delete personal game');
    }
  }
}

export const personalGameService = new PersonalGameService();