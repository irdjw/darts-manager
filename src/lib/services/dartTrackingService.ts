import type { SupabaseClient } from '@supabase/supabase-js';
import type { DartThrow, TurnData, LegData, PlayerGameStats } from '../types/scoring';
import { statisticsService } from './statisticsService';

export class DartTrackingService {
  private static instance: DartTrackingService;
  private supabase: SupabaseClient;

  private constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  static getInstance(supabaseClient: SupabaseClient): DartTrackingService {
    if (!DartTrackingService.instance) {
      DartTrackingService.instance = new DartTrackingService(supabaseClient);
    }
    return DartTrackingService.instance;
  }

  // Save a single dart throw to the database
  async saveDartThrow(
    leagueGameId: string,
    playerId: string,
    dart: DartThrow,
    runningTotal: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('dart_tracking')
        .insert({
          league_game_id: leagueGameId,
          player_id: playerId,
          dart_score: dart.dartScore,
          running_total: runningTotal,
          turn_number: dart.turnNumber,
          dart_in_turn: dart.dartNumber,
          leg_number: dart.legNumber,
          is_double_attempt: dart.isDoubleAttempt || false,
          is_checkout_attempt: dart.isCheckoutAttempt || false,
          checkout_successful: dart.checkoutSuccessful || false,
          timestamp: dart.timestamp || new Date()
        });

      if (error) {
        console.error('Error saving dart throw:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception saving dart throw:', error);
      return { success: false, error: 'Failed to save dart throw' };
    }
  }

  // Save multiple darts (complete turn) to the database
  async saveTurnDarts(
    leagueGameId: string,
    playerId: string,
    darts: DartThrow[],
    finalScore: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Calculate running totals for each dart
      let currentScore = finalScore + darts.reduce((sum, dart) => sum + dart.dartScore, 0);
      
      const dartInserts = darts.map((dart, index) => {
        currentScore -= dart.dartScore;
        return {
          league_game_id: leagueGameId,
          player_id: playerId,
          dart_score: dart.dartScore,
          running_total: currentScore,
          turn_number: dart.turnNumber,
          dart_in_turn: dart.dartNumber,
          leg_number: dart.legNumber,
          is_double_attempt: dart.isDoubleAttempt || false,
          is_checkout_attempt: dart.isCheckoutAttempt || false,
          checkout_successful: dart.checkoutSuccessful || false,
          timestamp: dart.timestamp || new Date()
        };
      });

      const { error } = await this.supabase
        .from('dart_tracking')
        .insert(dartInserts);

      if (error) {
        console.error('Error saving turn darts:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception saving turn darts:', error);
      return { success: false, error: 'Failed to save turn darts' };
    }
  }

  // Get all darts for a specific game and player
  async getPlayerGameDarts(
    leagueGameId: string,
    playerId: string
  ): Promise<{ darts: DartThrow[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('dart_tracking')
        .select('*')
        .eq('league_game_id', leagueGameId)
        .eq('player_id', playerId)
        .order('leg_number', { ascending: true })
        .order('turn_number', { ascending: true })
        .order('dart_in_turn', { ascending: true });

      if (error) {
        console.error('Error fetching game darts:', error);
        return { darts: [], error: error.message };
      }

      const darts: DartThrow[] = (data || []).map(row => ({
        id: row.id?.toString() || crypto.randomUUID(),
        legNumber: row.leg_number,
        turnNumber: row.turn_number,
        dartNumber: row.dart_in_turn,
        dartScore: row.dart_score,
        runningScore: row.running_total,
        isDoubleAttempt: row.is_double_attempt || false,
        isCheckoutAttempt: row.is_checkout_attempt || false,
        checkoutSuccessful: row.checkout_successful || false,
        timestamp: new Date(row.timestamp),
        playerId: row.player_id
      }));

      return { darts };
    } catch (error) {
      console.error('Exception fetching game darts:', error);
      return { darts: [], error: 'Failed to fetch game darts' };
    }
  }

  // Get all darts for a specific leg
  async getLegDarts(
    leagueGameId: string,
    legNumber: number
  ): Promise<{ darts: DartThrow[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('dart_tracking')
        .select('*')
        .eq('league_game_id', leagueGameId)
        .eq('leg_number', legNumber)
        .order('turn_number', { ascending: true })
        .order('dart_in_turn', { ascending: true });

      if (error) {
        console.error('Error fetching leg darts:', error);
        return { darts: [], error: error.message };
      }

      const darts: DartThrow[] = (data || []).map(row => ({
        id: row.id?.toString() || crypto.randomUUID(),
        legNumber: row.leg_number,
        turnNumber: row.turn_number,
        dartNumber: row.dart_in_turn,
        dartScore: row.dart_score,
        runningScore: row.running_total,
        isDoubleAttempt: row.is_double_attempt || false,
        isCheckoutAttempt: row.is_checkout_attempt || false,
        checkoutSuccessful: row.checkout_successful || false,
        timestamp: new Date(row.timestamp),
        playerId: row.player_id
      }));

      return { darts };
    } catch (error) {
      console.error('Exception fetching leg darts:', error);
      return { darts: [], error: 'Failed to fetch leg darts' };
    }
  }

  // Calculate real-time statistics for current leg
  async calculateLiveStats(
    leagueGameId: string,
    playerId: string,
    currentLeg: number
  ): Promise<{ stats: Partial<PlayerGameStats>; error?: string }> {
    try {
      const { darts, error } = await this.getLegDarts(leagueGameId, currentLeg);
      
      if (error) {
        return { stats: {}, error };
      }

      const playerDarts = darts.filter(dart => dart.playerId === playerId);
      const stats = statisticsService.calculateCurrentLegStats(playerDarts, currentLeg);

      return { stats };
    } catch (error) {
      console.error('Exception calculating live stats:', error);
      return { stats: {}, error: 'Failed to calculate live stats' };
    }
  }

  // Save complete leg data
  async saveLegData(
    leagueGameId: string,
    playerId: string,
    legData: LegData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, we'll store leg data implicitly through dart tracking
      // In the future, you might want a separate legs table
      
      // Mark the final dart as checkout if leg was won
      if (legData.won && legData.darts.length > 0) {
        const finalDart = legData.darts[legData.darts.length - 1];
        
        const { error } = await this.supabase
          .from('dart_tracking')
          .update({ checkout_successful: true })
          .eq('league_game_id', leagueGameId)
          .eq('player_id', playerId)
          .eq('leg_number', legData.legNumber)
          .eq('turn_number', finalDart.turnNumber)
          .eq('dart_in_turn', finalDart.dartNumber);

        if (error) {
          console.error('Error updating final dart checkout status:', error);
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Exception saving leg data:', error);
      return { success: false, error: 'Failed to save leg data' };
    }
  }

  // Get comprehensive game statistics
  async getGameStatistics(
    leagueGameId: string,
    playerId: string,
    playerName: string
  ): Promise<{ stats: PlayerGameStats | null; error?: string }> {
    try {
      const { darts, error } = await this.getPlayerGameDarts(leagueGameId, playerId);
      
      if (error) {
        return { stats: null, error };
      }

      // Calculate leg data from dart throws
      const legData = this.calculateLegDataFromDarts(darts);
      
      // Determine if game was won (simplified - check if any leg was won)
      const gameWon = legData.some(leg => leg.won);

      const stats = statisticsService.calculateGameStats(
        playerId,
        playerName,
        darts,
        legData,
        gameWon
      );

      return { stats };
    } catch (error) {
      console.error('Exception getting game statistics:', error);
      return { stats: null, error: 'Failed to get game statistics' };
    }
  }

  // Helper method to calculate leg data from dart throws
  private calculateLegDataFromDarts(darts: DartThrow[]): LegData[] {
    const legGroups = new Map<number, DartThrow[]>();
    
    // Group darts by leg number
    darts.forEach(dart => {
      if (!legGroups.has(dart.legNumber)) {
        legGroups.set(dart.legNumber, []);
      }
      legGroups.get(dart.legNumber)!.push(dart);
    });

    // Convert to LegData objects
    return Array.from(legGroups.entries()).map(([legNumber, legDarts]) => {
      const won = legDarts.some(dart => dart.checkoutSuccessful);
      const finalScore = won ? 0 : (legDarts[legDarts.length - 1]?.runningScore || 501);
      const totalDarts = legDarts.length;
      
      return {
        legNumber,
        playerId: legDarts[0]?.playerId || '',
        darts: legDarts,
        won,
        finalScore,
        darts: totalDarts,
        totalDarts,
        startTime: legDarts[0]?.timestamp || new Date(),
        endTime: legDarts[legDarts.length - 1]?.timestamp || new Date()
      };
    });
  }

  // Delete all darts for a game (for cleanup)
  async deleteGameDarts(leagueGameId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('dart_tracking')
        .delete()
        .eq('league_game_id', leagueGameId);

      if (error) {
        console.error('Error deleting game darts:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception deleting game darts:', error);
      return { success: false, error: 'Failed to delete game darts' };
    }
  }

  // Undo last dart (delete most recent dart for player in current leg)
  async undoLastDart(
    leagueGameId: string,
    playerId: string,
    currentLeg: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the most recent dart for this player in current leg
      const { data, error } = await this.supabase
        .from('dart_tracking')
        .select('id')
        .eq('league_game_id', leagueGameId)
        .eq('player_id', playerId)
        .eq('leg_number', currentLeg)
        .order('turn_number', { ascending: false })
        .order('dart_in_turn', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error finding last dart:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No dart to undo' };
      }

      // Delete the dart
      const { error: deleteError } = await this.supabase
        .from('dart_tracking')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.error('Error deleting dart:', deleteError);
        return { success: false, error: deleteError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception undoing dart:', error);
      return { success: false, error: 'Failed to undo dart' };
    }
  }

  // Get turn statistics for a specific turn
  async getTurnStats(
    leagueGameId: string,
    playerId: string,
    legNumber: number,
    turnNumber: number
  ): Promise<{ turnTotal: number; darts: DartThrow[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('dart_tracking')
        .select('*')
        .eq('league_game_id', leagueGameId)
        .eq('player_id', playerId)
        .eq('leg_number', legNumber)
        .eq('turn_number', turnNumber)
        .order('dart_in_turn', { ascending: true });

      if (error) {
        console.error('Error fetching turn stats:', error);
        return { turnTotal: 0, darts: [], error: error.message };
      }

      const darts: DartThrow[] = (data || []).map(row => ({
        id: row.id?.toString() || crypto.randomUUID(),
        legNumber: row.leg_number,
        turnNumber: row.turn_number,
        dartNumber: row.dart_in_turn,
        dartScore: row.dart_score,
        runningScore: row.running_total,
        isDoubleAttempt: row.is_double_attempt || false,
        isCheckoutAttempt: row.is_checkout_attempt || false,
        checkoutSuccessful: row.checkout_successful || false,
        timestamp: new Date(row.timestamp),
        playerId: row.player_id
      }));

      const turnTotal = darts.reduce((sum, dart) => sum + dart.dartScore, 0);

      return { turnTotal, darts };
    } catch (error) {
      console.error('Exception fetching turn stats:', error);
      return { turnTotal: 0, darts: [], error: 'Failed to fetch turn stats' };
    }
  }

  // Batch save multiple dart throws (for performance)
  async batchSaveDarts(
    leagueGameId: string,
    playerId: string,
    darts: Array<{ dart: DartThrow; runningTotal: number }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const inserts = darts.map(({ dart, runningTotal }) => ({
        league_game_id: leagueGameId,
        player_id: playerId,
        dart_score: dart.dartScore,
        running_total: runningTotal,
        turn_number: dart.turnNumber,
        dart_in_turn: dart.dartNumber,
        leg_number: dart.legNumber,
        is_double_attempt: dart.isDoubleAttempt || false,
        is_checkout_attempt: dart.isCheckoutAttempt || false,
        checkout_successful: dart.checkoutSuccessful || false,
        timestamp: dart.timestamp || new Date()
      }));

      const { error } = await this.supabase
        .from('dart_tracking')
        .insert(inserts);

      if (error) {
        console.error('Error batch saving darts:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception batch saving darts:', error);
      return { success: false, error: 'Failed to batch save darts' };
    }
  }

  // Get checkout opportunities and success rates
  async getCheckoutAnalytics(
    leagueGameId: string,
    playerId: string
  ): Promise<{ 
    checkoutOpportunities: number;
    successfulCheckouts: number;
    checkoutPercentage: number;
    averageCheckoutScore: number;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('dart_tracking')
        .select('dart_score, is_checkout_attempt, checkout_successful')
        .eq('league_game_id', leagueGameId)
        .eq('player_id', playerId)
        .eq('is_checkout_attempt', true);

      if (error) {
        console.error('Error fetching checkout analytics:', error);
        return {
          checkoutOpportunities: 0,
          successfulCheckouts: 0,
          checkoutPercentage: 0,
          averageCheckoutScore: 0,
          error: error.message
        };
      }

      const checkoutAttempts = data || [];
      const checkoutOpportunities = checkoutAttempts.length;
      const successfulCheckouts = checkoutAttempts.filter(attempt => attempt.checkout_successful).length;
      const checkoutPercentage = checkoutOpportunities > 0 ? (successfulCheckouts / checkoutOpportunities) * 100 : 0;
      
      const successfulCheckoutScores = checkoutAttempts
        .filter(attempt => attempt.checkout_successful)
        .map(attempt => attempt.dart_score);
      
      const averageCheckoutScore = successfulCheckoutScores.length > 0
        ? successfulCheckoutScores.reduce((sum, score) => sum + score, 0) / successfulCheckoutScores.length
        : 0;

      return {
        checkoutOpportunities,
        successfulCheckouts,
        checkoutPercentage: Math.round(checkoutPercentage * 100) / 100,
        averageCheckoutScore: Math.round(averageCheckoutScore * 100) / 100
      };
    } catch (error) {
      console.error('Exception fetching checkout analytics:', error);
      return {
        checkoutOpportunities: 0,
        successfulCheckouts: 0,
        checkoutPercentage: 0,
        averageCheckoutScore: 0,
        error: 'Failed to fetch checkout analytics'
      };
    }
  }
}

// Helper function to initialize with Supabase client
export function createDartTrackingService(supabaseClient: SupabaseClient) {
  return DartTrackingService.getInstance(supabaseClient);
}