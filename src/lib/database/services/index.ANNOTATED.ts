/**
 * ============================================================================
 * INDEX.TS — Database Services Barrel Export
 * ============================================================================
 *
 * PURPOSE:
 * Single import point for all database service classes. Instead of:
 *   import { PlayersService }    from '$lib/database/services/players';
 *   import { FixturesService }   from '$lib/database/services/fixtures';
 *   import { GamesService }      from '$lib/database/services/games';
 *   import { AttendanceService } from '$lib/database/services/attendance';
 *
 * You write:
 *   import { PlayersService, FixturesService } from '$lib/database/services';
 *
 * Also re-exports the most commonly used types so callers don't need a
 * separate import from types.ts for basic operations.
 *
 * SERVICES IN THIS BARREL:
 *   PlayersService    — CRUD for the players table (4 static methods)
 *   FixturesService   — CRUD for fixtures (3 static methods)
 *   GamesService      — CRUD for individual game results (8 static methods)
 *   AttendanceService — CRUD for weekly attendance (11 static methods)
 *
 * ALL services follow the same conventions:
 *   - Static methods only (no new Service() needed)
 *   - Every method returns ApiResponse<T>  — { data, error, loading }
 *   - Errors are translated via handleDatabaseError() before returning
 */

// Service classes
export { PlayersService }    from './players.js';
export { FixturesService }   from './fixtures.js';
export { GamesService }      from './games.js';
export { AttendanceService } from './attendance.js';

// Commonly used types — avoids a second import line for callers
export type { Player, Fixture, LeagueGame, Attendance, ApiResponse } from '../types.js';
