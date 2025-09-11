# Claude Code CLI Prompt: Add Custom One-Off Matches Feature

## Context
I have a SvelteKit darts team management app with existing player management, scoring engine, and dart-by-dart tracking. I need to add functionality for custom one-off matches that aren't part of the regular league fixtures.

## Requirements

### 1. Dashboard Integration
- Add a "Custom Match" button/card to the main dashboard
- Should be prominent and easily accessible
- Route to `/custom-match` page

### 2. Match Setup Interface
Create a new page (`src/routes/custom-match/+page.svelte`) with:
- **Player Selection**: Dropdown/search to select from existing team players
- **Guest Player Addition**: Form to add temporary guest players (name only, not stored permanently)
- **Game Format Selection**: 501, 301, or other variants
- **Leg Format**: Single leg, best of 3, best of 5, best of 7
- **First Thrower**: Radio buttons to select who throws first
- **Match Type**: Practice vs Competitive (for statistics categorization)

### 3. Scoring Integration
- Reuse existing `ScoringEngine.svelte` component
- Integrate with `MobileDartEntry.svelte` for dart input
- Use same checkout validation and rules as league games
- Support guest players in the scoring interface

### 4. Database Integration
- Create new service `customMatchService.ts` for database operations
- Save dart-by-dart entries to new `custom_dart_tracking` table
- Save game statistics to new `custom_game_statistics` table
- Link both tables to a parent `custom_matches` table

### 5. Results Display
- Show match results upon completion
- Option to save/export results
- Basic statistics summary (averages, high scores, etc.)

## Database Schema Required

```sql
-- Parent table for custom matches
CREATE TABLE custom_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('practice', 'competitive')),
  game_format INTEGER NOT NULL DEFAULT 501,
  leg_format VARCHAR(20) NOT NULL CHECK (leg_format IN ('single', 'best_of_3', 'best_of_5', 'best_of_7')),
  player1_id UUID REFERENCES players(id),
  player1_name VARCHAR(100) NOT NULL, -- For guest players
  player1_is_guest BOOLEAN DEFAULT FALSE,
  player2_id UUID REFERENCES players(id),
  player2_name VARCHAR(100) NOT NULL, -- For guest players  
  player2_is_guest BOOLEAN DEFAULT FALSE,
  first_thrower INTEGER CHECK (first_thrower IN (1, 2)),
  winner INTEGER CHECK (winner IN (1, 2)),
  legs_won_player1 INTEGER DEFAULT 0,
  legs_won_player2 INTEGER DEFAULT 0,
  total_legs_played INTEGER DEFAULT 0,
  match_date TIMESTAMP DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dart-by-dart tracking for custom matches
CREATE TABLE custom_dart_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_match_id UUID NOT NULL REFERENCES custom_matches(id) ON DELETE CASCADE,
  leg_number INTEGER NOT NULL,
  turn_number INTEGER NOT NULL,
  dart_number INTEGER NOT NULL CHECK (dart_number BETWEEN 1 AND 3),
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  dart_score INTEGER NOT NULL CHECK (dart_score >= 0 AND dart_score <= 180),
  multiplier INTEGER DEFAULT 1 CHECK (multiplier IN (1, 2, 3)),
  segment INTEGER CHECK (segment BETWEEN 1 AND 20 OR segment = 25),
  running_total INTEGER NOT NULL,
  remaining_score INTEGER NOT NULL,
  is_bust BOOLEAN DEFAULT FALSE,
  is_checkout_attempt BOOLEAN DEFAULT FALSE,
  checkout_successful BOOLEAN DEFAULT FALSE,
  thrown_at TIMESTAMP DEFAULT NOW()
);

-- Game statistics for custom matches
CREATE TABLE custom_game_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_match_id UUID NOT NULL REFERENCES custom_matches(id) ON DELETE CASCADE,
  leg_number INTEGER NOT NULL,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  leg_won BOOLEAN DEFAULT FALSE,
  total_darts INTEGER DEFAULT 0,
  three_dart_average DECIMAL(5,2) DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  total_180s INTEGER DEFAULT 0,
  scores_140_plus INTEGER DEFAULT 0,
  scores_100_plus INTEGER DEFAULT 0,
  checkout_attempts INTEGER DEFAULT 0,
  checkout_hits INTEGER DEFAULT 0,
  checkout_percentage DECIMAL(5,2) DEFAULT 0,
  leg_duration_seconds INTEGER,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_custom_dart_tracking_match_leg ON custom_dart_tracking(custom_match_id, leg_number);
CREATE INDEX idx_custom_game_statistics_match ON custom_game_statistics(custom_match_id);
CREATE INDEX idx_custom_matches_date ON custom_matches(match_date DESC);
```

## Files to Create/Modify

### New Files:
- `src/routes/custom-match/+page.svelte` - Main custom match interface
- `src/routes/custom-match/[id]/+page.svelte` - Individual match view/replay
- `src/lib/services/customMatchService.ts` - Database operations
- `src/lib/components/CustomMatchSetup.svelte` - Match configuration
- `src/lib/components/GuestPlayerForm.svelte` - Add guest players
- `src/lib/types/customMatch.ts` - TypeScript interfaces

### Files to Modify:
- `src/routes/dashboard/+page.svelte` - Add custom match button
- `src/lib/components/MobileNavigation.svelte` - Add navigation item
- `src/lib/components/ScoringEngine.svelte` - Support guest players
- `src/lib/database/types.ts` - Add new table types

## Integration Points
- Use existing `MobileDartEntry.svelte` for dart input
- Leverage current scoring validation logic
- Integrate with existing player selection components
- Reuse statistics calculation functions where possible

## Implementation Notes:
- Guest players kept separate from permanent team players ✅
- Statistics kept separate from league data ✅
- No match history page needed (database access sufficient) ✅
- Support for 301, 501, and 701 formats ✅
- Doubles play functionality included ✅
- No role-based access restrictions ✅

## Technical Considerations:
1. **Doubles Turn Order**: Implement Team1-P1, Team2-P1, Team1-P2, Team2-P2 rotation
2. **Game Format Logic**: Different starting scores (301/501/701) with same checkout rules
3. **Statistics Aggregation**: Individual player stats within team context for doubles
4. **UI Responsiveness**: Ensure 4-player doubles interface works well on mobile
5. **Guest Player Validation**: Prevent duplicate names within the same match

Please implement this feature following the existing codebase patterns and TypeScript standards. Use British English throughout and ensure mobile-first responsive design.