import { supabase, handleDatabaseError } from '$lib/database/supabase';
import type { 
  CustomMatch, 
  CustomDartTracking, 
  CustomGameStatistics 
} from '$lib/database/types';
import type { 
  CreateCustomMatchParams, 
  CustomMatchPlayer,
  CustomMatchSummary 
} from '$lib/types/customMatch';
import type { DartThrow, PlayerGameStats } from '$lib/types/scoring';

export class CustomMatchService {
  /**
   * Create a new custom match
   */
  async createMatch(params: CreateCustomMatchParams): Promise<string> {
    try {
      const matchData = {
        match_type: params.match_type,
        game_format: params.game_format,
        leg_format: params.leg_format,
        player1_id: params.player1_id || null,
        player1_name: params.player1_name,
        player1_is_guest: params.player1_is_guest || false,
        player2_id: params.player2_id || null,
        player2_name: params.player2_name,
        player2_is_guest: params.player2_is_guest || false,
        first_thrower: params.first_thrower,
        legs_won_player1: 0,
        legs_won_player2: 0,
        total_legs_played: 0,
        completed: false,
        match_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('custom_matches')
        .insert(matchData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating custom match:', error);
        throw error;
      }

      return data.id;
    } catch (err: any) {
      console.error('createMatch error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get a custom match by ID
   */
  async getMatch(matchId: string): Promise<CustomMatch | null> {
    try {
      const { data, error } = await supabase
        .from('custom_matches')
        .select(`
          *,
          players1:player1_id(id, name),
          players2:player2_id(id, name)
        `)
        .eq('id', matchId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (err: any) {
      console.error('getMatch error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Update match progress (legs won, completion status)
   */
  async updateMatchProgress(
    matchId: string, 
    legsWonPlayer1: number, 
    legsWonPlayer2: number, 
    totalLegsPlayed: number,
    winner?: 1 | 2
  ): Promise<void> {
    try {
      const updateData: any = {
        legs_won_player1: legsWonPlayer1,
        legs_won_player2: legsWonPlayer2,
        total_legs_played: totalLegsPlayed,
        updated_at: new Date().toISOString()
      };

      if (winner) {
        updateData.winner = winner;
        updateData.completed = true;
      }

      const { error } = await supabase
        .from('custom_matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;
    } catch (err: any) {
      console.error('updateMatchProgress error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Save dart throw data for custom match
   */
  async saveDartThrow(
    matchId: string,
    legNumber: number,
    turnNumber: number,
    dartNumber: 1 | 2 | 3,
    playerNumber: 1 | 2,
    dartScore: number,
    multiplier: 1 | 2 | 3,
    segment?: number,
    runningTotal?: number,
    remainingScore?: number,
    isBust?: boolean,
    isCheckoutAttempt?: boolean,
    checkoutSuccessful?: boolean
  ): Promise<void> {
    try {
      const dartData = {
        custom_match_id: matchId,
        leg_number: legNumber,
        turn_number: turnNumber,
        dart_number: dartNumber,
        player_number: playerNumber,
        dart_score: dartScore,
        multiplier: multiplier,
        segment: segment || null,
        running_total: runningTotal || 0,
        remaining_score: remainingScore || 0,
        is_bust: isBust || false,
        is_checkout_attempt: isCheckoutAttempt || false,
        checkout_successful: checkoutSuccessful || false,
        is_180: dartScore === 180,
        thrown_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('custom_dart_tracking')
        .insert(dartData);

      if (error) throw error;
    } catch (err: any) {
      console.error('saveDartThrow error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Save leg statistics for custom match
   */
  async saveLegStatistics(
    matchId: string,
    legNumber: number,
    playerNumber: 1 | 2,
    legWon: boolean,
    stats: PlayerGameStats,
    legDurationSeconds?: number
  ): Promise<void> {
    try {
      const statsData = {
        custom_match_id: matchId,
        leg_number: legNumber,
        player_number: playerNumber,
        leg_won: legWon,
        total_darts: stats.totalDarts,
        three_dart_average: Math.round((stats.totalPoints / stats.totalDarts) * 3 * 100) / 100,
        highest_score: stats.highestScore || 0,
        lowest_score: stats.lowestScore || 0,
        total_180s: stats.scores180,
        scores_140_plus: stats.scores140Plus,
        scores_100_plus: stats.scores100Plus,
        scores_60_plus: stats.scores80Plus, // Reusing this field
        checkout_attempts: stats.checkoutAttempts,
        checkout_hits: stats.checkoutHits,
        checkout_percentage: stats.checkoutPercentage,
        highest_checkout: stats.highestCheckout,
        leg_duration_seconds: legDurationSeconds || null,
        completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('custom_game_statistics')
        .insert(statsData);

      if (error) throw error;
    } catch (err: any) {
      console.error('saveLegStatistics error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get dart tracking for a match
   */
  async getMatchDarts(matchId: string): Promise<CustomDartTracking[]> {
    try {
      const { data, error } = await supabase
        .from('custom_dart_tracking')
        .select('*')
        .eq('custom_match_id', matchId)
        .order('leg_number')
        .order('turn_number')
        .order('dart_number');

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getMatchDarts error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get match statistics
   */
  async getMatchStatistics(matchId: string): Promise<CustomGameStatistics[]> {
    try {
      const { data, error } = await supabase
        .from('custom_game_statistics')
        .select('*')
        .eq('custom_match_id', matchId)
        .order('leg_number')
        .order('player_number');

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getMatchStatistics error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get match summary with all related data
   */
  async getMatchSummary(matchId: string): Promise<CustomMatchSummary | null> {
    try {
      const [match, statistics] = await Promise.all([
        this.getMatch(matchId),
        this.getMatchStatistics(matchId)
      ]);

      if (!match) return null;

      const player1Stats = statistics.filter(s => s.player_number === 1);
      const player2Stats = statistics.filter(s => s.player_number === 2);

      return {
        match,
        player1_stats: player1Stats,
        player2_stats: player2Stats
      };
    } catch (err: any) {
      console.error('getMatchSummary error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get recent custom matches
   */
  async getRecentMatches(limit: number = 10): Promise<CustomMatch[]> {
    try {
      const { data, error } = await supabase
        .from('custom_matches')
        .select(`
          *,
          players1:player1_id(id, name),
          players2:player2_id(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getRecentMatches error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Get matches by player (including guest appearances)
   */
  async getPlayerMatches(playerId: string, limit: number = 20): Promise<CustomMatch[]> {
    try {
      const { data, error } = await supabase
        .from('custom_matches')
        .select(`
          *,
          players1:player1_id(id, name),
          players2:player2_id(id, name)
        `)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('getPlayerMatches error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Delete a custom match and all related data
   */
  async deleteMatch(matchId: string): Promise<void> {
    try {
      // Delete in reverse order of dependencies
      // Statistics and dart tracking will cascade delete due to foreign key constraints
      const { error } = await supabase
        .from('custom_matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
    } catch (err: any) {
      console.error('deleteMatch error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * Validate guest player names within a match (prevent duplicates)
   */
  validateGuestPlayers(player1: CustomMatchPlayer, player2: CustomMatchPlayer): string | null {
    // Check for duplicate names
    if (player1.name.toLowerCase().trim() === player2.name.toLowerCase().trim()) {
      return 'Player names must be different';
    }

    // Check name length
    if (player1.name.trim().length < 2 || player2.name.trim().length < 2) {
      return 'Player names must be at least 2 characters long';
    }

    // Check for special characters (basic validation)
    const namePattern = /^[a-zA-Z0-9\s'-]+$/;
    if (!namePattern.test(player1.name) || !namePattern.test(player2.name)) {
      return 'Player names can only contain letters, numbers, spaces, hyphens and apostrophes';
    }

    return null; // Valid
  }

  /**
   * Get statistics summary for all custom matches
   */
  async getCustomMatchAnalytics(): Promise<{
    totalMatches: number;
    completedMatches: number;
    practiceMatches: number;
    competitiveMatches: number;
    averageMatchDuration: number;
    popularGameFormats: { format: number; count: number }[];
    topPlayers: { name: string; wins: number; matches: number }[];
  }> {
    try {
      const { data: matches, error } = await supabase
        .from('custom_matches')
        .select('*');

      if (error) throw error;

      const totalMatches = matches?.length || 0;
      const completedMatches = matches?.filter(m => m.completed).length || 0;
      const practiceMatches = matches?.filter(m => m.match_type === 'practice').length || 0;
      const competitiveMatches = matches?.filter(m => m.match_type === 'competitive').length || 0;

      // Calculate average match duration (if we had duration tracking)
      const averageMatchDuration = 0; // Placeholder

      // Popular game formats
      const formatCounts = new Map<number, number>();
      matches?.forEach(match => {
        const count = formatCounts.get(match.game_format) || 0;
        formatCounts.set(match.game_format, count + 1);
      });
      const popularGameFormats = Array.from(formatCounts.entries())
        .map(([format, count]) => ({ format, count }))
        .sort((a, b) => b.count - a.count);

      // Top players (wins)
      const playerStats = new Map<string, { wins: number; matches: number }>();
      matches?.forEach(match => {
        if (match.completed && match.winner) {
          const winnerName = match.winner === 1 ? match.player1_name : match.player2_name;
          const stats = playerStats.get(winnerName) || { wins: 0, matches: 0 };
          stats.wins += 1;
          playerStats.set(winnerName, stats);
        }
        
        // Count matches for both players
        [match.player1_name, match.player2_name].forEach(name => {
          const stats = playerStats.get(name) || { wins: 0, matches: 0 };
          stats.matches += 1;
          playerStats.set(name, stats);
        });
      });

      const topPlayers = Array.from(playerStats.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);

      return {
        totalMatches,
        completedMatches,
        practiceMatches,
        competitiveMatches,
        averageMatchDuration,
        popularGameFormats,
        topPlayers
      };
    } catch (err: any) {
      console.error('getCustomMatchAnalytics error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }
}

// Singleton instance
export const customMatchService = new CustomMatchService();