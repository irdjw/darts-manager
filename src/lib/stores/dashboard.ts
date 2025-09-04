// src/lib/services/dashboardService.ts
import { supabase } from '$lib/database/supabase';
import type { Fixture, Player, AttendanceRecord, DashboardStats } from '$lib/types/dashboard';

export class DashboardService {
  async getCurrentFixture(): Promise<Fixture | null> {
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league_year', '2025/26')
      .order('week_number', { ascending: true })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching current fixture:', error);
      return null;
    }
    
    return data;
  }
  
  async getUpcomingFixtures(limit: number = 5): Promise<Fixture[]> {
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league_year', '2025/26')
      .eq('status', 'to_play')
      .order('week_number', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching upcoming fixtures:', error);
      throw new Error('Failed to load fixtures');
    }
    
    return data || [];
  }
  
  async getSeasonStats(): Promise<DashboardStats> {
    // Get team stats
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('result, team_won')
      .eq('league_year', '2025/26');
    
    const gamesWon = fixtures?.filter(f => f.team_won === true).length || 0;
    const gamesLost = fixtures?.filter(f => f.team_won === false).length || 0;
    const totalGames = gamesWon + gamesLost;
    const winPercentage = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;
    
    // Get remaining fixtures
    const { data: remaining } = await supabase
      .from('fixtures')
      .select('id')
      .eq('league_year', '2025/26')
      .eq('status', 'to_play');
    
    // Get top performers
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .order('win_percentage', { ascending: false })
      .limit(2);
    
    return {
      current_position: 1, // This would come from league table calculation
      games_won: gamesWon,
      games_lost: gamesLost,
      win_percentage: winPercentage,
      remaining_fixtures: remaining?.length || 0,
      top_performer: players?.[0] || {} as Player,
      most_improved: players?.[1] || {} as Player
    };
  }
  
  async getAllPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching players:', error);
      throw new Error('Failed to load players');
    }
    
    return data || [];
  }
  
  async getWeeklyAttendance(weekNumber: number): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        player:players(*)
      `)
      .eq('week_number', weekNumber)
      .eq('league_year', '2025/26');
    
    if (error) {
      console.error('Error fetching attendance:', error);
      throw new Error('Failed to load attendance');
    }
    
    return data || [];
  }
  
  async markAttendance(playerId: string, weekNumber: number, available: boolean): Promise<void> {
    const { error } = await supabase
      .from('attendance')
      .upsert({
        player_id: playerId,
        week_number: weekNumber,
        league_year: '2025/26',
        available
      });
    
    if (error) {
      console.error('Error marking attendance:', error);
      throw new Error('Failed to update attendance');
    }
  }
}

export const dashboardService = new DashboardService();