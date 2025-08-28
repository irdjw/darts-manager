import { supabase, handleDatabaseError } from '../supabase.js';
import type { Fixture, ApiResponse } from '../types.js';

export class FixturesService {
  /**
   * Get all fixtures for current season
   */
  static async getAll(): Promise<ApiResponse<Fixture[]>> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('week_number');

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
   * Get current week's fixture
   */
  static async getCurrentWeekFixture(): Promise<ApiResponse<Fixture>> {
    try {
      // Get the latest incomplete fixture
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('completed', false)
        .order('week_number')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { 
        data: data || null, 
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
   * Update fixture result
   */
  static async updateResult(
    fixtureId: string, 
    ourScore: number, 
    oppositionScore: number
  ): Promise<ApiResponse<Fixture>> {
    try {
      const result = ourScore > oppositionScore ? 'win' : 
                    ourScore < oppositionScore ? 'loss' : 'draw';

      const { data, error } = await supabase
        .from('fixtures')
        .update({
          our_score: ourScore,
          opposition_score: oppositionScore,
          result,
          completed: true
        })
        .eq('id', fixtureId)
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