/**
 * ============================================================================
 * FIXTURES.TS — Fixture Database Service
 * ============================================================================
 *
 * PURPOSE:
 * CRUD operations for the fixtures table. A fixture is one weekly team match
 * (Isaac Wilson vs an opponent). Three static methods: list all, get the
 * current one, and record the final result.
 *
 * FIXTURE LIFECYCLE:
 *   created (status = 'to_play', completed = false)
 *        ↓  match day
 *   in_progress (optional intermediate state)
 *        ↓  scores recorded
 *   completed (completed = true, result = 'win'|'loss'|'draw')
 *
 * METHODS:
 *   getAll()                      — All fixtures, ordered by week
 *   getCurrentWeekFixture()       — First incomplete fixture (the "next" match)
 *   updateResult(id, our, theirs) — Mark a fixture as completed with scores
 *
 * NOTES:
 *   - No league_year filter on getAll(). If multiple seasons exist in the
 *     table, all fixtures are returned. The caller is responsible for
 *     filtering by season if needed.
 *   - getCurrentWeekFixture uses `completed = false` rather than
 *     `status = 'to_play'`. These should be equivalent but could diverge
 *     if a fixture is set to 'in_progress' without being marked completed.
 *   - updateResult derives the result string ('win'/'loss'/'draw') from
 *     the scores in JavaScript rather than doing it in a SQL trigger.
 */

import { supabase, handleDatabaseError } from '../supabase.js';
import type { Fixture, ApiResponse } from '../types.js';

export class FixturesService {
  // ── getAll ────────────────────────────────────────────────────────────────
  // Returns every fixture in the database, ordered by week_number ascending.
  // No season filter — see note above.
  static async getAll(): Promise<ApiResponse<Fixture[]>> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('week_number');

      if (error) throw error;

      return { data: data || [], error: null, loading: false };
    } catch (err) {
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }

  // ── getCurrentWeekFixture ─────────────────────────────────────────────────
  // The "next match to play" — the earliest fixture that hasn't been completed.
  //
  // WHY .eq('completed', false) instead of .eq('status', 'to_play')?
  // 'completed' is a boolean column that's definitively set when scores are
  // recorded. 'status' is a string that could have intermediate values
  // ('in_progress'). Using the boolean is more reliable.
  //
  // PGRST116 handling: .single() throws PGRST116 if no rows match.
  // That's fine here — it means the season is done. We catch it and return
  // null rather than propagating the error.
  static async getCurrentWeekFixture(): Promise<ApiResponse<Fixture>> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('completed', false)
        .order('week_number')       // Ascending by default — earliest first
        .limit(1)
        .single();

      // PGRST116 = no rows found. Not an error — just means no upcoming fixtures.
      if (error && error.code !== 'PGRST116') throw error;

      return { data: data || null, error: null, loading: false };
    } catch (err) {
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }

  // ── updateResult ──────────────────────────────────────────────────────────
  // Records the final scores and marks the fixture as completed.
  //
  // RESULT DERIVATION:
  //   ourScore > oppositionScore  →  'win'
  //   ourScore < oppositionScore  →  'loss'
  //   equal                       →  'draw'
  // Darts fixtures CAN draw (e.g. 4.5–4.5 in a 9-leg match).
  //
  // .select().single() returns the updated row so the caller gets the full
  // fixture back without a second query.
  static async updateResult(
    fixtureId: string,
    ourScore: number,
    oppositionScore: number
  ): Promise<ApiResponse<Fixture>> {
    try {
      // Derive result string from scores
      const result = ourScore > oppositionScore ? 'win' :
                    ourScore < oppositionScore ? 'loss' : 'draw';

      const { data, error } = await supabase
        .from('fixtures')
        .update({
          our_score:        ourScore,
          opposition_score: oppositionScore,
          result,                   // 'win' | 'loss' | 'draw'
          completed: true           // Marks fixture as done
        })
        .eq('id', fixtureId)
        .select()                   // Return the updated row
        .single();

      if (error) throw error;

      return { data, error: null, loading: false };
    } catch (err) {
      return { data: null, error: handleDatabaseError(err), loading: false };
    }
  }
}
