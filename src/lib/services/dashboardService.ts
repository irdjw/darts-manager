import { supabase, handleDatabaseError, retryDatabaseOperation } from '$lib/database/supabase';
import type { Fixture, Player, AttendanceRecord, DashboardStats } from '$lib/types/dashboard';

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
    // First try to get the next upcoming fixture
    const { data: upcomingFixture } = await supabase
      .from('fixtures')
      .select('week_number')
      .eq('league_year', '2025/26')
      .eq('result', 'to_play')
      .order('week_number', { ascending: true })
      .limit(1)
      .single();
    
    if (upcomingFixture) {
      return upcomingFixture.week_number;
    }
    
    // If no upcoming fixtures, get the latest completed one and add 1
    const { data: lastFixture } = await supabase
      .from('fixtures')
      .select('week_number')
      .eq('league_year', '2025/26')
      .order('week_number', { ascending: false })
      .limit(1)
      .single();
    
    return lastFixture ? lastFixture.week_number + 1 : 1;
    
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
      last_result: undefined,
      consecutive_losses: 0,
      drop_week: undefined
    };
  }
}