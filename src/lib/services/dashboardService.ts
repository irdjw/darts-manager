import { supabase, handleDatabaseError, retryDatabaseOperation } from '$lib/database/supabase';
import type { Player } from '$lib/database/types';
import type { Fixture, AttendanceRecord, DashboardStats } from '$lib/types/dashboard';
import type { PlayerGameStats } from '$lib/types/scoring';

export class DashboardService {
  /**
   * Get the current fixture (next upcoming match)
   */
  async getCurrentFixture(): Promise<Fixture | null> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .eq('result', 'to_play')
        .order('week_number', { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current fixture:', error);
        throw error;
      }
      
      return data || null;
    } catch (err: any) {
      console.error('getCurrentFixture error:', err);
      // Return null for not found, but throw for other errors
      if (err.code === 'PGRST116') {
        return null;
      }
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Get upcoming fixtures
   */
  async getUpcomingFixtures(limit: number = 5): Promise<Fixture[]> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .eq('result', 'to_play')
        .order('week_number', { ascending: true })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching upcoming fixtures:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      console.error('getUpcomingFixtures error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Get all fixtures for the current season
   */
  async getAllFixtures(): Promise<Fixture[]> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .order('week_number', { ascending: true });
      
      if (error) {
        console.error('Error fetching all fixtures:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      console.error('getAllFixtures error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Get comprehensive season statistics
   */
  async getSeasonStats(): Promise<DashboardStats> {
    try {
      // Get team match results
      const { data: fixtures, error: fixturesError } = await supabase
        .from('fixtures')
        .select('result, team_won, status')
        .eq('league_year', '2025/26');
      
      if (fixturesError) {
        console.error('Error fetching fixtures for stats:', fixturesError);
      }
      
      const completedFixtures = fixtures?.filter(f => f.status === 'completed') || [];
      const gamesWon = completedFixtures.filter(f => f.team_won === true).length;
      const gamesLost = completedFixtures.filter(f => f.team_won === false).length;
      const totalGames = gamesWon + gamesLost;
      const winPercentage = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;
      
      // Get remaining fixtures count
      const { data: remaining, error: remainingError } = await supabase
        .from('fixtures')
        .select('id')
        .eq('league_year', '2025/26')
        .eq('result', 'to_play');
      
      if (remainingError) {
        console.error('Error fetching remaining fixtures:', remainingError);
      }
      
      // Get top performers based on win percentage and games played
      const { data: topPlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .gte('games_played', 3) // Only include players with at least 3 games
        .order('win_percentage', { ascending: false })
        .order('games_won', { ascending: false })
        .limit(5);
      
      if (playersError) {
        console.error('Error fetching top players:', playersError);
      }
      
      // Get most improved player (highest recent win rate vs overall)
      const { data: recentPlayers, error: recentError } = await supabase
        .from('players')
        .select('*')
        .gte('games_played', 2)
        .order('consecutive_losses', { ascending: true })
        .order('win_percentage', { ascending: false })
        .limit(5);
      
      if (recentError) {
        console.error('Error fetching recent players:', recentError);
      }
      
      // Calculate current league position (simplified - would need league table logic)
      const currentPosition = this.calculateLeaguePosition(winPercentage, gamesWon);
      
      return {
        current_position: currentPosition,
        games_won: gamesWon,
        games_lost: gamesLost,
        win_percentage: winPercentage,
        remaining_fixtures: remaining?.length || 0,
        top_performer: topPlayers?.[0] || this.getDefaultPlayer('Top Performer'),
        most_improved: recentPlayers?.[0] || this.getDefaultPlayer('Most Improved')
      };
    } catch (err: any) {
      console.error('getSeasonStats error:', err);
      
      // Return default stats if database query fails
      return {
        current_position: 1,
        games_won: 0,
        games_lost: 0,
        win_percentage: 0,
        remaining_fixtures: 0,
        top_performer: this.getDefaultPlayer('Top Performer'),
        most_improved: this.getDefaultPlayer('Most Improved')
      };
    }
  }
  
  /**
   * Get all active players
   */
  async getAllPlayers(): Promise<Player[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching players:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      console.error('getAllPlayers error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Get attendance records for a specific week
   */
  async getWeeklyAttendance(weekNumber: number): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          player:players(*)
        `)
        .eq('week_number', weekNumber)
        .eq('league_year', '2025/26');
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching attendance:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      console.error('getWeeklyAttendance error:', err);
      if (err.code === 'PGRST116') {
        return [];
      }
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Save attendance records for multiple players
   */
  async saveAttendance(records: Partial<AttendanceRecord>[]): Promise<void> {
    try {
      if (!records || records.length === 0) {
        throw new Error('No attendance records provided');
      }

      // Use retry logic for critical save operations
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('attendance')
          .upsert(records, { 
            onConflict: 'player_id,week_number,league_year'
          });
        
        if (error) {
          console.error('Error saving attendance:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('saveAttendance error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Get current week number based on fixtures
   */
async getCurrentWeek(): Promise<number> {
  try {
    // Get the lowest week number where result = "to_play"
    const { data: currentFixture } = await supabase
      .from('fixtures')
      .select('week_number')
      .eq('league_year', '2025/26')
      .eq('result', 'to_play')
      .order('week_number', { ascending: true })
      .limit(1)
      .single();
    
    return currentFixture ? currentFixture.week_number : 1;
    
  } catch (err: any) {
    console.error('getCurrentWeek error:', err);
    // Calculate week based on current date as fallback
    const seasonStart = new Date('2025-08-01'); // Adjust this to your season start
    const now = new Date();
    const weeksDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, weeksDiff + 1);
  }
}
  
  /**
   * Get recent match results
   */
  async getRecentResults(limit: number = 5): Promise<Fixture[]> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .eq('result', 'completed')
        .order('week_number', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching recent results:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      console.error('getRecentResults error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
  
  /**
   * Get player statistics summary
   */
  async getPlayerStatsSummary(): Promise<{
    totalPlayers: number;
    activePlayers: number;
    topScorer: Player | null;
    averageWinRate: number;
  }> {
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('*');
      
      if (error) {
        console.error('Error fetching player stats:', error);
        throw error;
      }
      
      const totalPlayers = players?.length || 0;
      const activePlayers = players?.filter(p => p.drop_week === null).length || 0;
      const topScorer = players?.reduce((top, player) => 
        (!top || player.total_180s > top.total_180s) ? player : top
      , null as Player | null) || null;
      
      const averageWinRate = totalPlayers > 0 
        ? players.reduce((sum, p) => sum + (p.win_percentage || 0), 0) / totalPlayers 
        : 0;
      
      return {
        totalPlayers,
        activePlayers,
        topScorer,
        averageWinRate: Math.round(averageWinRate * 100) / 100
      };
    } catch (err: any) {
      console.error('getPlayerStatsSummary error:', err);
      // Return fallback data instead of throwing for this method
      // since it's used for dashboard display
      return {
        totalPlayers: 0,
        activePlayers: 0,
        topScorer: null,
        averageWinRate: 0
      };
    }
  }
  
  /**
   * Calculate estimated league position based on win percentage
   * This is a simplified calculation - in reality you'd need full league table data
   */
  private calculateLeaguePosition(winPercentage: number, gamesWon: number): number {
    if (winPercentage >= 80) return 1;
    if (winPercentage >= 70) return 2;
    if (winPercentage >= 60) return 3;
    if (winPercentage >= 50) return 4;
    if (winPercentage >= 40) return 5;
    return 6;
  }
  
  /**
   * Get default player object when no data is available
   */
  private getDefaultPlayer(name: string): Player {
    return {
      id: '',
      name,
      games_played: 0,
      games_won: 0,
      games_lost: 0,
      total_180s: 0,
      win_percentage: 0,
      highest_checkout: 0,
      last_result: null,
      consecutive_losses: 0,
      drop_week: null
    };
  }

  /**
   * Save individual league game result
   */
  async saveLeagueGame(gameData: {
    fixture_id: string;
    game_number: number;
    our_player_id: string;
    opponent_name: string;
    result: 'win' | 'loss';
  }): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('league_games')
          .upsert({
            fixture_id: gameData.fixture_id,
            game_number: gameData.game_number,
            our_player_id: gameData.our_player_id,
            opponent_name: gameData.opponent_name,
            result: gameData.result,
          }, {
            onConflict: 'fixture_id,game_number'
          });

        if (error) {
          console.error('Error saving league game:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('saveLeagueGame error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Save game statistics for a player
   */
  async saveGameStatistics(stats: PlayerGameStats, fixtureId: string): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('game_statistics')
          .insert({
            player_id: stats.playerId,
            player_name: stats.playerName,
            game_type: 'league',
            fixture_id: fixtureId,
            game_date: new Date().toISOString().split('T')[0],
            league_year: '2025/26',
            opponent_type: 'team',
            opponent_name: 'Opposition Player',
            game_won: stats.gameWon,
            legs_played: stats.legsPlayed,
            legs_won: stats.legsWon,
            total_darts: stats.totalDarts,
            total_points: stats.totalPoints,
            scores_180: stats.scores180,
            scores_140_plus: stats.scores140Plus,
            scores_100_plus: stats.scores100Plus,
            scores_80_plus: stats.scores80Plus,
            double_attempts: stats.doubleAttempts,
            double_hits: stats.doubleHits,
            checkout_attempts: stats.checkoutAttempts,
            checkout_hits: stats.checkoutHits,
            highest_checkout: stats.highestCheckout
          });

        if (error) {
          console.error('Error saving game statistics:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('saveGameStatistics error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Update player statistics after a game
   */
  async updatePlayerStats(playerId: string, gameResult: 'win' | 'loss', gameStats: Partial<PlayerGameStats>): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // Get current player stats
        const { data: player, error: fetchError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (fetchError) throw fetchError;

        // Calculate updated stats
        const updatedStats = {
          games_played: (player.games_played || 0) + 1,
          games_won: (player.games_won || 0) + (gameResult === 'win' ? 1 : 0),
          games_lost: (player.games_lost || 0) + (gameResult === 'loss' ? 1 : 0),
          total_darts: (player.total_darts || 0) + (gameStats.totalDarts || 0),
          total_180s: (player.total_180s || 0) + (gameStats.scores180 || 0),
          highest_checkout: Math.max(player.highest_checkout || 0, gameStats.highestCheckout || 0),
          checkout_attempts: (player.checkout_attempts || 0) + (gameStats.checkoutAttempts || 0),
          checkout_hits: (player.checkout_hits || 0) + (gameStats.checkoutHits || 0),
          last_result: gameResult,
          consecutive_losses: gameResult === 'win' ? 0 : (player.consecutive_losses || 0) + 1
        };

        // Calculate win percentage
        const win_percentage = updatedStats.games_played > 0 
          ? Math.round((updatedStats.games_won / updatedStats.games_played) * 100 * 100) / 100
          : 0;

        // Update player in database
        const { error: updateError } = await supabase
          .from('players')
          .update({ ...updatedStats, win_percentage })
          .eq('id', playerId);

        if (updateError) {
          console.error('Error updating player stats:', updateError);
          throw updateError;
        }
      });
    } catch (err: any) {
      console.error('updatePlayerStats error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get existing league game assignments for a fixture
   */
  async getLeagueGameAssignments(fixtureId: string): Promise<Array<{
    game_number: number;
    our_player_id: string;
    opponent_name?: string;
    result?: 'win' | 'loss';
    is_completed?: boolean;
  }>> {
    try {
      const { data, error } = await supabase
        .from('league_games')
        .select(`
          game_number,
          our_player_id,
          opponent_name,
          result,
          created_at
        `)
        .eq('fixture_id', fixtureId)
        .order('game_number', { ascending: true });

      if (error) {
        console.error('Error fetching league game assignments:', error);
        throw error;
      }

      // Get completed games from game_statistics to determine which results are real
      const { data: completedGames, error: statsError } = await supabase
        .from('game_statistics')
        .select('game_session_id, player_id')
        .eq('fixture_id', fixtureId);

      if (statsError) {
        console.warn('Could not fetch game statistics:', statsError);
      }

      const completedPlayerIds = new Set(completedGames?.map(g => g.player_id) || []);

      return (data || []).map(game => ({
        ...game,
        is_completed: completedPlayerIds.has(game.our_player_id)
      }));
    } catch (err: any) {
      console.error('getLeagueGameAssignments error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Save or update a single game assignment
   */
  async saveGameAssignment(fixtureId: string, gameNumber: number, playerId: string): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // First check if the assignment already exists
        const { data: existingGame } = await supabase
          .from('league_games')
          .select('id, result')
          .eq('fixture_id', fixtureId)
          .eq('game_number', gameNumber)
          .single();

        if (existingGame) {
          // Update only the player assignment, preserve existing result
          const { error } = await supabase
            .from('league_games')
            .update({
              our_player_id: playerId,
              opponent_name: 'Opposition Player'
            })
            .eq('fixture_id', fixtureId)
            .eq('game_number', gameNumber);

          if (error) {
            console.error('Error updating game assignment:', error);
            throw error;
          }
        } else {
          // Create new assignment with temporary result that satisfies schema
          const { error } = await supabase
            .from('league_games')
            .insert({
              fixture_id: fixtureId,
              game_number: gameNumber,
              our_player_id: playerId,
              opponent_name: 'Opposition Player',
              result: 'loss' // Temporary result - will be updated when game is completed
            });

          if (error) {
            console.error('Error saving game assignment:', error);
            throw error;
          }
        }
      });
    } catch (err: any) {
      console.error('saveGameAssignment error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Remove a game assignment
   */
  async removeGameAssignment(fixtureId: string, gameNumber: number): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('league_games')
          .delete()
          .eq('fixture_id', fixtureId)
          .eq('game_number', gameNumber);

        if (error) {
          console.error('Error removing game assignment:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('removeGameAssignment error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Update game result
   */
  async updateGameResult(fixtureId: string, gameNumber: number, result: 'win' | 'loss'): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('league_games')
          .update({ result })
          .eq('fixture_id', fixtureId)
          .eq('game_number', gameNumber);

        if (error) {
          console.error('Error updating game result:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('updateGameResult error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Complete a fixture with all game results (atomic transaction)
   */
  async completeFixture(fixtureId: string, gameResults: Array<{
    gameNumber: number;
    playerId: string;
    playerName: string;
    result: 'win' | 'loss';
    stats?: PlayerGameStats;
  }>): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // Start a transaction by batching operations
        const operations = [];

        // Calculate match result
        const wins = gameResults.filter(g => g.result === 'win').length;
        const losses = gameResults.filter(g => g.result === 'loss').length;
        const teamWon = wins > losses;

        // Update fixture status
        operations.push(
          supabase
            .from('fixtures')
            .update({
              result: teamWon ? 'win' : 'loss',
              status: 'completed',
              team_won: teamWon
            })
            .eq('id', fixtureId)
        );

        // Save each game result
        for (const game of gameResults) {
          operations.push(
            supabase
              .from('league_games')
              .upsert({
                fixture_id: fixtureId,
                game_number: game.gameNumber,
                our_player_id: game.playerId,
                opponent_name: 'Opposition Player',
                result: game.result
              }, {
                onConflict: 'fixture_id,game_number'
              })
          );

          // Save game statistics if provided
          if (game.stats) {
            operations.push(
              this.saveGameStatistics(game.stats, fixtureId)
            );

            // Update player statistics
            operations.push(
              this.updatePlayerStats(game.playerId, game.result, game.stats)
            );
          }
        }

        // Execute all operations
        const results = await Promise.allSettled(operations);
        
        // Check if any operations failed
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          console.error('Some operations failed during fixture completion:', failures);
          throw new Error('Failed to complete fixture - some operations failed');
        }
      });
    } catch (err: any) {
      console.error('completeFixture error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
}