# Claude Code Prompt: Fix Player Assignment Saving Issue

## Problem Summary
My SvelteKit darts team management app has an issue where player assignments to games don't save properly. The root cause is inconsistent field usage in the code - some components use `attended` while others use `available`, but the database schema only has `available`.

## Database Schema Context
The database is correctly designed and needs NO changes:

**Attendance Table** (correct as-is):
- `available: boolean` - Whether player is available for the week
- `selected: boolean` - Whether captain has selected them for team

**League Games Table** (already handles game assignments):
- `fixture_id` - Links to match fixture
- `game_number` - Games 1-7 within each fixture  
- `our_player_id` - Which player is assigned to this game
- `opponent_name` - Opposition player name
- `result` - 'win' or 'loss' when game completed

## Task Required
Fix all components to consistently use the `available` field instead of `attended`. The workflow should be:

1. Players mark themselves as `available: true/false`
2. Captain selects 7 players from available ones (`selected: true`)
3. Captain assigns selected players to games 1-7 (saved to `league_games` table)
4. Games are played and results recorded

## Files That Need Attention
Based on my analysis, these files likely have the field inconsistency issue:

1. `src/routes/team/+page.svelte` - Team management component
2. `src/routes/match/[id]/+page.svelte` - Match management component  
3. `src/lib/services/dashboardService.ts` - Database service layer
4. `src/lib/stores/teamManagement.ts` - Team management store
5. Any other components that reference attendance data

## Specific Issues to Look For

1. **Field Name Inconsistency**:
   - Replace all `attended` with `available` 
   - Replace all `.attended` with `.available`
   - Ensure database queries use `available` field

2. **Attendance Logic**:
   - `available: true` means player is available for selection
   - `selected: true` means captain chose them for the team (subset of available)

3. **Game Assignment Logic**:
   - When captain assigns players to games 1-7, save to `league_games` table
   - Use `our_player_id` to store which player is assigned
   - Set initial `result` as null until game is completed

4. **Load Assignment Logic**:  
   - When loading match management, query `league_games` table
   - Show which players are assigned to which games
   - Allow reassignment if game not yet completed

## Expected Outcome
After fixing the field inconsistency, the player assignment workflow should work properly:
- Assignments persist when navigating away from match management
- Selected team loads correctly from database  
- Game assignments save and reload properly
- No data loss during the workflow

## British English Requirement
Ensure all user-facing text uses British English spellings (e.g., "colour" not "color", "realise" not "realize").

Please analyse the codebase, identify the inconsistent field usage, and fix all components to use the correct `available` field from the database schema.