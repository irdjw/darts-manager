# Darts Manager - Complete System Documentation

## For Someone New: Understanding the Entire Application

This document explains the ENTIRE darts management application from the ground up. If you're new to this codebase, start here.

---

## What This Application Does

This is a web application for managing a professional darts team. It handles:

1. **Player Management** - Track all players, their stats, and availability
2. **Attendance** - Players mark if they can play each week
3. **Team Selection** - Captain picks 7 players from available ones
4. **Match Fixtures** - Schedule matches against other teams
5. **Live Scoring** - Record dart throws during actual games
6. **Statistics** - Calculate averages, checkout percentages, wins/losses
7. **Practice Tracking** - Players can log practice sessions

---

## Technology Stack

### Frontend
- **SvelteKit** - Web framework (handles routing, pages, server-side rendering)
- **Svelte 5** - UI component framework (reactive, compiled)
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first styling

### Backend/Database
- **Supabase** - PostgreSQL database + authentication
- **Netlify** - Hosting and deployment

### Architecture
- **Progressive Web App (PWA)** - Can install on phone, works offline
- **Server-Side Rendering (SSR)** - Pages render on server first

---

## How SvelteKit Applications Work (Basics)

### File-Based Routing

In SvelteKit, the file structure determines URLs:

```
src/routes/
  +page.svelte           → yoursite.com/
  attendance/
    +page.svelte         → yoursite.com/attendance
  team-selection/
    [week]/
      +page.svelte       → yoursite.com/team-selection/5  (week is a parameter)
```

### Special Files

- **`+page.svelte`** - The actual page component (HTML + JavaScript)
- **`+page.server.ts`** - Server-side code that runs BEFORE page loads
- **`+layout.svelte`** - Wrapper around multiple pages (like header/footer)
- **`+layout.server.ts`** - Server code for layouts

### Page Load Flow

```
1. User visits URL
   ↓
2. hooks.server.ts runs (authentication check)
   ↓
3. +layout.server.ts runs (fetch session data)
   ↓
4. +page.server.ts runs (fetch page-specific data)
   ↓
5. Page renders with data
   ↓
6. Browser shows page
```

---

## Application Architecture

### Layer 1: Routes (Pages)
**Location:** `/src/routes/`

These are the actual pages users visit. Each page is a `.svelte` file.

**Example:** `/src/routes/attendance/+page.svelte`
- Shows list of all players
- User clicks buttons to mark available/unavailable
- Saves to database when user clicks "Save Changes"

### Layer 2: Components (Reusable UI)
**Location:** `/src/lib/components/`

These are reusable pieces of UI used by multiple pages.

**Example:** `/src/lib/components/PlayerCard.svelte`
- Shows a single player's info (name, stats, avatar)
- Used by: attendance page, team selection page, statistics page
- Receives player data as a "prop" (parameter)

### Layer 3: Stores (State Management)
**Location:** `/src/lib/stores/`

Stores hold data that multiple pages/components need access to.

**How Svelte Stores Work:**
```typescript
// Create a store
export const players = writable<Player[]>([]);

// Component A can update it
players.set([player1, player2, player3]);

// Component B automatically sees the new data
$players.forEach(player => console.log(player.name));
```

**Example:** `/src/lib/stores/teamManagement.ts`
- Holds current team selection state
- Available players, selected players, auto-picked players
- Multiple components read from this store

### Layer 4: Services (Business Logic)
**Location:** `/src/lib/services/`

Services contain the "business logic" - the code that makes decisions and processes data.

**Example:** `/src/lib/services/checkoutService.ts`
- Input: Current score (e.g., 87)
- Logic: Calculate all possible ways to finish the game
- Output: List of checkout routes (e.g., "T17, D18" or "T19, D15")

### Layer 5: Database (Data Access)
**Location:** `/src/lib/database/`

Database layer talks to Supabase (PostgreSQL database).

**Structure:**
- **`types.ts`** - TypeScript definitions for database tables
- **`supabase.ts`** - Connection to database
- **`services/`** - Functions to read/write data

**Example:** `/src/lib/database/services/players.ts`
```typescript
// Get all players from database
static async getAll(): Promise<Player[]> {
  const { data } = await supabase
    .from('players')  // SQL: SELECT * FROM players
    .select('*')
    .order('name');

  return data || [];
}
```

### Layer 6: Types (TypeScript Definitions)
**Location:** `/src/lib/types/`

TypeScript definitions describe the "shape" of data.

**Example:** `/src/lib/types/scoring.ts`
```typescript
// This tells TypeScript what a DartThrow looks like
interface DartThrow {
  dartScore: number;        // 0-60 (or 180 for maximum)
  multiplier: 1 | 2 | 3;    // Single, Double, or Treble
  isDoubleAttempt: boolean; // Trying to hit a double?
  dartNumber: 1 | 2 | 3;    // First, second, or third dart of turn
}
```

---

## Database Tables (Simplified)

### players
Stores information about each player.

```
id | name      | games_played | games_won | win_percentage | total_180s
---|-----------|--------------|-----------|----------------|------------
1  | John Doe  | 20           | 12        | 60.0           | 5
2  | Jane Smith| 18           | 10        | 55.5           | 3
```

### fixtures
Stores scheduled matches.

```
id | week_number | opposition        | venue | match_date | result
---|-------------|-------------------|-------|------------|--------
1  | 1           | Red Lion Arrows   | home  | 2025-09-05 | win
2  | 2           | Queens Head Darts | away  | 2025-09-12 | to_play
```

### attendance
Tracks who can play each week.

```
id | player_id | week_number | league_year | available | selected
---|-----------|-------------|-------------|-----------|----------
1  | 1         | 2           | 2025/26     | true      | true
2  | 2         | 2           | 2025/26     | true      | false
3  | 3         | 2           | 2025/26     | false     | false
```

**Explanation:**
- `available = true` means player marked themselves as available
- `selected = true` means captain picked them for the team
- Week 2, player 1 is available AND selected (playing this week)
- Week 2, player 2 is available but NOT selected (bench/reserve)
- Week 2, player 3 is unavailable (can't play)

### league_games
Stores individual game results within a match.

```
id | fixture_id | game_number | our_player_id | opponent_name | result
---|------------|-------------|---------------|---------------|--------
1  | 1          | 1           | 1             | Bob Smith     | win
2  | 1          | 2           | 2             | Mary Jones    | loss
```

**Explanation:**
- Each fixture (match) has 9 games
- Game 1: Our player (id 1) beat Bob Smith
- Game 2: Our player (id 2) lost to Mary Jones

---

## Key Application Flows

### Flow 1: Player Marks Attendance

```
1. User visits /attendance
   ↓
2. Page loads all active players from database
   ↓
3. Page loads existing attendance records for current week
   ↓
4. UI shows list of players with Available/Unavailable buttons
   ↓
5. User clicks button to toggle John Doe from Available → Unavailable
   ↓
6. JavaScript updates local state (Map in memory)
   ↓
7. User clicks "Save Changes"
   ↓
8. JavaScript sends ALL attendance data to database
   ↓
9. Database saves records
   ↓
10. Page shows success (or error if something failed)
```

**Files Involved:**
- `/src/routes/attendance/+page.svelte` - The page
- `/src/lib/database/supabase.ts` - Database connection
- Database table: `attendance`

### Flow 2: Captain Selects Team

```
1. User visits /team-selection
   ↓
2. Page redirects to /team-selection/[week_number]
   ↓
3. Page loads all players from database
   ↓
4. Page loads attendance for this week
   ↓
5. teamManagement.ts store filters players:
   - available_players (marked as available)
   - unavailable_players (marked as unavailable or no record)
   ↓
6. UI shows two lists: Available and Unavailable
   ↓
7. Captain clicks on players to select them
   ↓
8. Selection is limited to 7 players
   ↓
9. Captain clicks "Confirm Team"
   ↓
10. Save to database (updates 'selected' field in attendance)
```

**Files Involved:**
- `/src/routes/team-selection/[week]/+page.svelte` - The page
- `/src/lib/stores/teamManagement.ts` - Selection logic
- `/src/lib/services/dashboardService.ts` - Database queries
- Database table: `attendance`

### Flow 3: Live Scoring a Game

```
1. User visits /scoring/[fixture_id]
   ↓
2. Page loads fixture details
   ↓
3. Page shows dart entry interface (number grid 0-20, 25)
   ↓
4. Player throws dart → hits Treble 20 (60 points)
   ↓
5. User taps "20" then taps "Treble" then taps "Confirm"
   ↓
6. scoringStores.ts updates:
   - Current score (e.g., 501 → 441)
   - Dart history (for undo)
   - Turn total (60 so far)
   - Statistics (running average)
   ↓
7. After 3 darts, turn completes
   ↓
8. Switch to other player
   ↓
9. Repeat until someone reaches exactly 0 on a double
   ↓
10. GameCompleteModal shows winner and stats
   ↓
11. Save game result to database
```

**Files Involved:**
- `/src/routes/scoring/[id]/+page.svelte` - The page
- `/src/lib/components/MobileDartEntry.svelte` - Dart input UI
- `/src/lib/components/NumberGrid.svelte` - Number buttons
- `/src/lib/stores/scoringStores.ts` - Game state
- `/src/lib/services/checkoutService.ts` - Calculates finishes
- `/src/lib/services/statisticsService.ts` - Calculates averages
- `/src/lib/database/services/games.ts` - Saves result

---

## Common Patterns in This Codebase

### Pattern 1: Async/Await for Database

All database operations are asynchronous (take time to complete).

```typescript
// WRONG - this won't work
const players = supabase.from('players').select('*');
console.log(players); // ❌ Just prints a Promise

// CORRECT - wait for result
const { data: players } = await supabase.from('players').select('*');
console.log(players); // ✅ Prints actual player data
```

### Pattern 2: Try/Catch for Error Handling

```typescript
try {
  // Try to do something
  await database.save(data);
} catch (error) {
  // If it fails, handle the error
  console.error('Save failed:', error);
  showErrorToUser(error.message);
}
```

### Pattern 3: Svelte Reactivity

```typescript
// $ prefix means "reactive" - automatically updates when data changes
let count = 0;

// In HTML:
{#if count > 5}
  <p>Count is greater than 5!</p>
{/if}

// When count changes, HTML automatically updates
count = 10; // Now the <p> tag appears
```

### Pattern 4: Service Singletons

Many services use the "singleton" pattern - only one instance exists.

```typescript
export class CheckoutService {
  private static instance: CheckoutService;

  static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService();
    }
    return CheckoutService.instance;
  }
}

// Usage: Everyone gets the same instance
const service1 = CheckoutService.getInstance();
const service2 = CheckoutService.getInstance();
// service1 === service2 (same object)
```

**Why?** The checkout service calculates all possible finishes when it's created (expensive). We only want to do this once, not every time someone needs checkout info.

---

## Data Flow Example: Complete Walkthrough

Let's trace what happens when a user marks attendance:

### Step 1: User Opens Attendance Page

**File: `/src/routes/attendance/+page.svelte`**

```typescript
onMount(() => {
  loadData();
});
```

**What happens:**
- Svelte calls `onMount()` when page appears
- `loadData()` function is called

### Step 2: Load Data Function Runs

```typescript
async function loadData() {
  // Test database connection
  await supabase.from('players').select('count').limit(1);

  // Get current week number
  currentWeek = await dashboardService.getCurrentWeek();

  // Load all active players
  const { data: playersData } = await supabase
    .from('players')
    .select('*')
    .eq('active', true);

  players = playersData || [];

  // Load existing attendance
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('player_id, available')
    .eq('week_number', currentWeek);

  // Create a Map of player_id → available
  attendance = new Map();
  players.forEach(player => {
    const record = attendanceData?.find(a => a.player_id === player.id);
    attendance.set(player.id, record?.available ?? true);
  });
}
```

**Database Queries Made:**
1. `SELECT count FROM players LIMIT 1` (connection test)
2. `SELECT week_number FROM fixtures WHERE result='to_play' ORDER BY week_number LIMIT 1` (current week)
3. `SELECT * FROM players WHERE active=true ORDER BY name` (all players)
4. `SELECT player_id, available FROM attendance WHERE week_number=2` (attendance records)

**Data Structures Created:**
```javascript
players = [
  { id: '1', name: 'John Doe', games_played: 20, ... },
  { id: '2', name: 'Jane Smith', games_played: 18, ... },
  { id: '3', name: 'Bob Jones', games_played: 15, ... }
]

attendance = Map {
  '1' => true,   // John is available
  '2' => true,   // Jane is available
  '3' => false   // Bob is unavailable
}
```

### Step 3: UI Renders

```svelte
{#each players as player}
  {@const isAvailable = attendance.get(player.id) ?? true}

  <div>
    <span>{player.name}</span>
    <button on:click={() => toggleAttendance(player.id)}>
      {isAvailable ? 'Available' : 'Unavailable'}
    </button>
  </div>
{/each}
```

**What user sees:**
```
John Doe      [Available ✅]
Jane Smith    [Available ✅]
Bob Jones     [Unavailable ❌]
```

### Step 4: User Clicks Button

User clicks "Available" button for John Doe.

```typescript
function toggleAttendance(playerId: string) {
  const current = attendance.get(playerId) ?? true;  // current = true
  attendance.set(playerId, !current);                 // set to false
  attendance = attendance;  // Trigger Svelte reactivity
  hasChanges = true;       // Show "Save Changes" button
}
```

**State changes:**
```javascript
attendance = Map {
  '1' => false,  // John is NOW unavailable
  '2' => true,
  '3' => false
}
```

**UI updates automatically:**
```
John Doe      [Unavailable ❌]  ← Changed!
Jane Smith    [Available ✅]
Bob Jones     [Unavailable ❌]

[Save Changes]  ← Button appears
```

### Step 5: User Clicks "Save Changes"

```typescript
async function saveAttendance() {
  // Delete existing records for this week
  await supabase
    .from('attendance')
    .delete()
    .eq('week_number', currentWeek)
    .eq('league_year', '2025/26');

  // Create new records
  const records = players.map(player => ({
    player_id: player.id,
    week_number: currentWeek,
    league_year: '2025/26',
    available: attendance.get(player.id) ?? true,
    selected: false
  }));

  // Insert all records
  await supabase
    .from('attendance')
    .insert(records);
}
```

**Database Operations:**

1. **DELETE Query:**
```sql
DELETE FROM attendance
WHERE week_number = 2
  AND league_year = '2025/26';
```

2. **INSERT Query:**
```sql
INSERT INTO attendance (player_id, week_number, league_year, available, selected)
VALUES
  ('1', 2, '2025/26', false, false),
  ('2', 2, '2025/26', true, false),
  ('3', 2, '2025/26', false, false);
```

### Step 6: Database Updated

**Before:**
```
id | player_id | week_number | available | selected
---|-----------|-------------|-----------|----------
1  | 1         | 2           | true      | true
2  | 2         | 2           | true      | false
3  | 3         | 2           | false     | false
```

**After:**
```
id | player_id | week_number | available | selected
---|-----------|-------------|-----------|----------
4  | 1         | 2           | false     | false  ← CHANGED
5  | 2         | 2           | true      | false
6  | 3         | 2           | false     | false
```

**PROBLEM SPOTTED:**
Notice that player 1's `selected` field changed from `true` to `false`!
This is the bug - we're overwriting the captain's team selection.

---

## Code Duplication Issues

### Issue 1: Multiple Database Services

We have overlapping database access patterns:

**Location A:** `/src/lib/database/services/players.ts`
```typescript
export class PlayersService {
  static async getAll() {
    const { data } = await supabase.from('players').select('*');
    return data;
  }
}
```

**Location B:** `/src/lib/services/dashboardService.ts`
```typescript
export class DashboardService {
  async getAllPlayers() {
    const { data } = await supabase.from('players').select('*');
    return data || [];
  }
}
```

**Problem:** Same query, two places. Which should we use?

**Solution Needed:** Consolidate to one location.

### Issue 2: Attendance Save Logic

**Location A:** `/src/routes/attendance/+page.svelte` (delete-then-insert)
**Location B:** `/src/lib/services/dashboardService.ts` (upsert with onConflict)
**Location C:** `/src/lib/database/services/attendance.ts` (check-then-update-or-insert)

**Problem:** Three different ways to save attendance.

**Solution Needed:** Pick one approach and use everywhere.

### Issue 3: Fixture Queries

Fixtures are queried with `league_year` filter in many places:

- `/src/lib/services/dashboardService.ts` - 8 occurrences
- Other files may also have this

**Problem:** Hardcoded '2025/26' everywhere. What happens next season?

**Solution Needed:** Store current league year in config or database.

---

## Next Steps for Full Annotation

I'll now systematically annotate:

1. ✅ Created system overview (this file)
2. ⏳ Annotate all routes
3. ⏳ Annotate all components
4. ⏳ Annotate all services
5. ⏳ Annotate all stores
6. ⏳ Annotate database layer
7. ⏳ Document all duplications
8. ⏳ Create visual flow diagrams

Shall I continue with the detailed file-by-file annotations?
