import { supabase, handleDatabaseError } from '../supabase.js';
import type { Attendance, Player, ApiResponse } from '../types.js';

export class AttendanceService {
  /**
   * Get attendance records for a specific week
   */
  static async getByWeek(weekNumber: number): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, players(*)')
        .eq('week_number', weekNumber)
        .order('players(name)');

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
   * Get attendance records for a specific player
   */
  static async getByPlayer(playerId: string): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('player_id', playerId)
        .order('week_number', { ascending: false });

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
   * Get available players for a specific week
   */
  static async getAvailablePlayers(weekNumber: number): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, players(*)')
        .eq('week_number', weekNumber)
        .eq('available', true)
        .order('players(name)');

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
   * Get selected players for a specific week
   */
  static async getSelectedPlayers(weekNumber: number): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, players(*)')
        .eq('week_number', weekNumber)
        .eq('selected', true)
        .order('players(name)');

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
   * Mark player availability for a week
   */
  static async markAvailability(
    playerId: string,
    weekNumber: number,
    available: boolean
  ): Promise<ApiResponse<Attendance>> {
    try {
      // Check if attendance record already exists
      const { data: existing, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('player_id', playerId)
        .eq('week_number', weekNumber)
        .single();

      // If record exists, update it
      if (existing) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ available })
          .eq('player_id', playerId)
          .eq('week_number', weekNumber)
          .select('*, players(*)')
          .single();

        if (error) throw error;

        console.log('✅ Attendance updated successfully:', data);

        return {
          data,
          error: null,
          loading: false
        };
      }

      // Otherwise, create new record
      const attendanceData = {
        player_id: playerId,
        week_number: weekNumber,
        available,
        selected: false
      };

      const { data, error } = await supabase
        .from('attendance')
        .insert([attendanceData])
        .select('*, players(*)')
        .single();

      if (error) {
        console.error('Mark availability error:', error);
        throw error;
      }

      console.log('✅ Attendance marked successfully:', data);

      return {
        data,
        error: null,
        loading: false
      };
    } catch (err) {
      console.error('markAvailability error:', err);
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * Select players for team (captain/admin only)
   */
  static async selectPlayer(
    playerId: string,
    weekNumber: number,
    selected: boolean
  ): Promise<ApiResponse<Attendance>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ selected })
        .eq('player_id', playerId)
        .eq('week_number', weekNumber)
        .select('*, players(*)')
        .single();

      if (error) throw error;

      console.log(`✅ Player ${selected ? 'selected' : 'deselected'} successfully:`, data);

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
   * Bulk select players for team
   */
  static async bulkSelectPlayers(
    playerIds: string[],
    weekNumber: number
  ): Promise<ApiResponse<Attendance[]>> {
    try {
      // First, deselect all players for this week
      await supabase
        .from('attendance')
        .update({ selected: false })
        .eq('week_number', weekNumber);

      // Then select the specified players
      if (playerIds.length > 0) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ selected: true })
          .eq('week_number', weekNumber)
          .in('player_id', playerIds)
          .select('*, players(*)');

        if (error) throw error;

        console.log('✅ Team selected successfully:', data);

        return {
          data: data || [],
          error: null,
          loading: false
        };
      }

      return {
        data: [],
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
   * Create attendance records for all players for a new week
   */
  static async initializeWeek(
    weekNumber: number,
    playerIds: string[]
  ): Promise<ApiResponse<Attendance[]>> {
    try {
      const attendanceRecords = playerIds.map(playerId => ({
        player_id: playerId,
        week_number: weekNumber,
        available: false,
        selected: false
      }));

      const { data, error } = await supabase
        .from('attendance')
        .insert(attendanceRecords)
        .select('*, players(*)');

      if (error) {
        console.error('Initialize week error:', error);
        throw error;
      }

      console.log('✅ Week initialized successfully:', data);

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      console.error('initializeWeek error:', err);
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * Get attendance statistics for a player
   */
  static async getPlayerAttendanceStats(playerId: string): Promise<ApiResponse<{
    totalWeeks: number;
    weeksAvailable: number;
    weeksSelected: number;
    availabilityPercentage: number;
    selectionPercentage: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('available, selected')
        .eq('player_id', playerId);

      if (error) throw error;

      const records = data || [];
      const totalWeeks = records.length;
      const weeksAvailable = records.filter(r => r.available).length;
      const weeksSelected = records.filter(r => r.selected).length;

      const stats = {
        totalWeeks,
        weeksAvailable,
        weeksSelected,
        availabilityPercentage: totalWeeks > 0 ? (weeksAvailable / totalWeeks) * 100 : 0,
        selectionPercentage: weeksAvailable > 0 ? (weeksSelected / weeksAvailable) * 100 : 0
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
   * Get weeks since player last played
   */
  static async getWeeksSinceLastPlayed(playerId: string, currentWeek: number): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('week_number')
        .eq('player_id', playerId)
        .eq('selected', true)
        .order('week_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const weeksSince = data ? currentWeek - data.week_number : null;

      return {
        data: weeksSince,
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
   * Delete attendance record (admin only)
   */
  static async deleteAttendance(attendanceId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', attendanceId);

      if (error) throw error;

      console.log('✅ Attendance deleted successfully');

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
}
