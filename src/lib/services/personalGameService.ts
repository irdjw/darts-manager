// Enhanced Personal Game Service for comprehensive solo practice tracking
import { supabase } from '$lib/database/supabase';
import type { PersonalGame, PersonalStats, PersonalGoal } from '$lib/database/types';
import type { PlayerGameStats, DartThrow } from '$lib/types/scoring';
import { statisticsService } from './statisticsService';

export class PersonalGameService {
  /**
   * Create a new personal practice game with game type
   */
  async createPersonalGame(
    playerId: string, 
    opponentName: string, 
    gameType: PersonalGame['game_type'] = 'practice_501',
    notes?: string
  ): Promise<string> {
    try {
      const gameData = {
        player_id: playerId,
        opponent_name: opponentName,
        game_type: gameType,
        game_date: new Date().toISOString().split('T')[0],
        game_won: false,
        legs_played: 0,
        legs_won: 0,
        notes: notes || null
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
   * Complete a personal game and save comprehensive statistics
   */
  async completePersonalGame(
    gameId: string, 
    gameWon: boolean, 
    legsPlayed: number, 
    legsWon: number,
    playerStats: PlayerGameStats,
    sessionDurationMinutes?: number,
    allDarts: DartThrow[] = []
  ): Promise<void> {
    try {
      // Update the game result with timing
      const { error: gameError } = await supabase
        .from('ddp')
        .update({
          game_won: gameWon,
          legs_played: legsPlayed,
          legs_won: legsWon,
          total_time_minutes: sessionDurationMinutes
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

      // Calculate enhanced statistics
      const firstDartAverage = this.calculateFirstDartAverage(allDarts);
      const threeDartAverage = playerStats.totalDarts > 0 ? (playerStats.totalPoints / playerStats.totalDarts) * 3 : 0;
      
      // Save comprehensive statistics
      const statsData = {
        player_id: gameData.player_id,
        player_name: playerStats.playerName,
        game_id: gameId,
        game_type: gameData.game_type,
        opponent_name: gameData.opponent_name,
        game_won: gameWon,
        legs_played: legsPlayed,
        legs_won: legsWon,
        total_darts: playerStats.totalDarts,
        total_points: playerStats.totalPoints,
        average_score: playerStats.average,
        scores_180: playerStats.scores180,
        scores_140_plus: playerStats.scores140Plus,
        scores_100_plus: playerStats.scores100Plus,
        scores_80_plus: playerStats.scores80Plus,
        double_attempts: playerStats.doubleAttempts,
        double_hits: playerStats.doubleHits,
        double_percentage: playerStats.doublePercentage,
        checkout_attempts: playerStats.checkoutAttempts,
        checkout_hits: playerStats.checkoutHits,
        checkout_percentage: playerStats.checkoutPercentage,
        highest_checkout: playerStats.highestCheckout,
        first_dart_average: firstDartAverage,
        three_dart_average: Math.round(threeDartAverage * 100) / 100,
        session_duration_minutes: sessionDurationMinutes,
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
   * Calculate first dart average from dart throws
   */
  private calculateFirstDartAverage(allDarts: DartThrow[]): number {
    const firstDarts = allDarts.filter(dart => dart.dartNumber === 1);
    if (firstDarts.length === 0) return 0;
    
    const totalFirstDartPoints = firstDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
    return Math.round((totalFirstDartPoints / firstDarts.length) * 100) / 100;
  }

  /**
   * Get comprehensive personal statistics summary
   */
  async getPersonalStatsSummary(playerId: string, gameType?: PersonalGame['game_type']): Promise<{
    totalGames: number;
    gamesWon: number;
    winPercentage: number;
    total180s: number;
    highestCheckout: number;
    averageScore: number;
    threeDartAverage: number;
    checkoutPercentage: number;
    doublePercentage: number;
    totalDarts: number;
    totalPoints: number;
    bestGame: PersonalStats | null;
    recentForm: boolean[];
    improvement: { trend: 'improving' | 'declining' | 'stable'; percentage: number };
  }> {
    try {
      let query = supabase
        .from('dstats')
        .select('*')
        .eq('player_id', playerId);
        
      if (gameType) {
        query = query.eq('game_type', gameType);
      }
        
      const { data, error } = await query;

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
      const threeDartAverage = totalDarts > 0 ? Math.round(((totalPoints / totalDarts) * 3) * 100) / 100 : 0;
      
      // Calculate checkout and double percentages
      const totalCheckoutAttempts = stats.reduce((sum, s) => sum + (s.checkout_attempts || 0), 0);
      const totalCheckoutHits = stats.reduce((sum, s) => sum + (s.checkout_hits || 0), 0);
      const checkoutPercentage = totalCheckoutAttempts > 0 ? Math.round((totalCheckoutHits / totalCheckoutAttempts) * 100) : 0;
      
      const totalDoubleAttempts = stats.reduce((sum, s) => sum + (s.double_attempts || 0), 0);
      const totalDoubleHits = stats.reduce((sum, s) => sum + (s.double_hits || 0), 0);
      const doublePercentage = totalDoubleAttempts > 0 ? Math.round((totalDoubleHits / totalDoubleAttempts) * 100) : 0;
      
      // Find best game
      const bestGame = stats.reduce((best, current) => {
        if (!best) return current;
        return current.three_dart_average > best.three_dart_average ? current : best;
      }, null as PersonalStats | null);
      
      // Recent form (last 10 games)
      const recentGames = stats.slice(-10);
      const recentForm = recentGames.map(game => game.game_won);
      
      // Calculate improvement trend
      const improvement = this.calculateImprovementTrend(stats);

      return {
        totalGames,
        gamesWon,
        winPercentage,
        total180s,
        highestCheckout,
        averageScore,
        threeDartAverage,
        checkoutPercentage,
        doublePercentage,
        totalDarts,
        totalPoints,
        bestGame,
        recentForm,
        improvement
      };
    } catch (err: any) {
      console.error('getPersonalStatsSummary error:', err);
      throw new Error('Failed to load personal statistics');
    }
  }

  /**
   * Calculate improvement trend from statistics
   */
  private calculateImprovementTrend(stats: PersonalStats[]): { trend: 'improving' | 'declining' | 'stable'; percentage: number } {
    if (stats.length < 4) return { trend: 'stable', percentage: 0 };
    
    const sortedStats = stats.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const halfPoint = Math.floor(sortedStats.length / 2);
    const firstHalf = sortedStats.slice(0, halfPoint);
    const secondHalf = sortedStats.slice(halfPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.three_dart_average, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.three_dart_average, 0) / secondHalf.length;
    
    const difference = secondHalfAvg - firstHalfAvg;
    const percentageChange = firstHalfAvg > 0 ? Math.round((difference / firstHalfAvg) * 100) : 0;
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(difference) > 1) {
      trend = difference > 0 ? 'improving' : 'declining';
    }
    
    return { trend, percentage: Math.abs(percentageChange) };
  }

  /**
   * Get detailed personal statistics with filtering
   */
  async getPersonalStats(
    playerId: string, 
    options: {
      limit?: number;
      gameType?: PersonalGame['game_type'];
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<PersonalStats[]> {
    const { limit = 50, gameType, dateFrom, dateTo } = options;
    try {
      let query = supabase
        .from('dstats')
        .select('*')
        .eq('player_id', playerId);
        
      if (gameType) {
        query = query.eq('game_type', gameType);
      }
      
      if (dateFrom) {
        query = query.gte('game_date', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('game_date', dateTo);
      }
      
      const { data, error } = await query
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
   * Get personal goals
   */
  async getPersonalGoals(playerId: string): Promise<PersonalGoal[]> {
    try {
      const { data, error } = await supabase
        .from('personal_goals')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getPersonalGoals error:', err);
      throw new Error('Failed to load personal goals');
    }
  }

  /**
   * Create a personal goal
   */
  async createPersonalGoal(
    playerId: string,
    goalType: PersonalGoal['goal_type'],
    targetValue: number,
    description: string,
    deadlineDate?: string
  ): Promise<string> {
    try {
      // Get current value based on goal type
      const currentValue = await this.getCurrentValueForGoal(playerId, goalType);
      
      const goalData = {
        player_id: playerId,
        goal_type: goalType,
        target_value: targetValue,
        current_value: currentValue,
        description,
        deadline_date: deadlineDate || null,
        achieved: false
      };

      const { data, error } = await supabase
        .from('personal_goals')
        .insert(goalData)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (err: any) {
      console.error('createPersonalGoal error:', err);
      throw new Error('Failed to create personal goal');
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(playerId: string): Promise<void> {
    try {
      const goals = await this.getPersonalGoals(playerId);
      
      for (const goal of goals) {
        if (goal.achieved) continue;
        
        const currentValue = await this.getCurrentValueForGoal(playerId, goal.goal_type);
        const achieved = currentValue >= goal.target_value;
        
        await supabase
          .from('personal_goals')
          .update({ 
            current_value: currentValue,
            achieved,
            achieved_at: achieved ? new Date().toISOString() : null
          })
          .eq('id', goal.id);
      }
    } catch (err: any) {
      console.error('updateGoalProgress error:', err);
    }
  }

  /**
   * Get current value for a goal type
   */
  private async getCurrentValueForGoal(playerId: string, goalType: PersonalGoal['goal_type']): Promise<number> {
    const summary = await this.getPersonalStatsSummary(playerId);
    
    switch (goalType) {
      case 'average_improvement':
        return summary.threeDartAverage;
      case 'checkout_percentage':
        return summary.checkoutPercentage;
      case '180_count':
        return summary.total180s;
      case 'consistency':
        return summary.threeDartAverage; // Could be more sophisticated
      default:
        return 0;
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

  /**
   * Get performance analytics for charts
   */
  async getPerformanceAnalytics(
    playerId: string, 
    days: number = 30
  ): Promise<{
    dailyAverages: { date: string; average: number; games: number }[];
    checkoutTrend: { date: string; percentage: number }[];
    gameTypeSummary: { gameType: string; games: number; winRate: number }[];
  }> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      
      const stats = await this.getPersonalStats(playerId, {
        limit: 1000,
        dateFrom: dateFrom.toISOString().split('T')[0]
      });
      
      // Group by date for daily averages
      const dailyData = new Map<string, { totalAverage: number; games: number }>();
      const checkoutData = new Map<string, { attempts: number; hits: number }>();
      const gameTypeData = new Map<string, { games: number; wins: number }>();
      
      stats.forEach(stat => {
        const date = stat.game_date;
        
        // Daily averages
        if (!dailyData.has(date)) {
          dailyData.set(date, { totalAverage: 0, games: 0 });
        }
        const dayData = dailyData.get(date)!;
        dayData.totalAverage += stat.three_dart_average;
        dayData.games += 1;
        
        // Checkout trend
        if (!checkoutData.has(date)) {
          checkoutData.set(date, { attempts: 0, hits: 0 });
        }
        const checkoutDay = checkoutData.get(date)!;
        checkoutDay.attempts += stat.checkout_attempts;
        checkoutDay.hits += stat.checkout_hits;
        
        // Game type summary
        if (!gameTypeData.has(stat.game_type)) {
          gameTypeData.set(stat.game_type, { games: 0, wins: 0 });
        }
        const gameTypeInfo = gameTypeData.get(stat.game_type)!;
        gameTypeInfo.games += 1;
        if (stat.game_won) gameTypeInfo.wins += 1;
      });
      
      return {
        dailyAverages: Array.from(dailyData.entries()).map(([date, data]) => ({
          date,
          average: Math.round((data.totalAverage / data.games) * 100) / 100,
          games: data.games
        })),
        checkoutTrend: Array.from(checkoutData.entries()).map(([date, data]) => ({
          date,
          percentage: data.attempts > 0 ? Math.round((data.hits / data.attempts) * 100) : 0
        })),
        gameTypeSummary: Array.from(gameTypeData.entries()).map(([gameType, data]) => ({
          gameType,
          games: data.games,
          winRate: Math.round((data.wins / data.games) * 100)
        }))
      };
    } catch (err: any) {
      console.error('getPerformanceAnalytics error:', err);
      throw new Error('Failed to load performance analytics');
    }
  }
}

// Singleton instance
export const personalGameService = new PersonalGameService();