# Attendance System - Issues Analysis

## Overview

After annotating all code related to attendance and team selection, I've identified the root causes of the "Operation failed after 3 attempts: Invalid request format" error.

---

## The Problem

**Error Message:** `Operation failed after 3 attempts: Invalid request format`
**Error Code:** PGRST204
**Location:** Occurs when saving attendance records

---

## Root Cause Analysis

### Issue #1: Missing Database Constraint

**Problem:**
The code attempts to use `upsert()` with `onConflict` parameter, but the database doesn't have the required unique constraint.

**Location:** `/src/lib/services/dashboardService.ts` line 308

```typescript
await supabase
  .from('attendance')
  .upsert(records, {
    onConflict: 'player_id,week_number'  // ❌ This constraint doesn't exist!
  });
```

**Database Reality:**
The `attendance` table has these constraints:
- PRIMARY KEY (id)
- FOREIGN KEY (player_id) REFERENCES players(id)
- **NO unique constraint on (player_id, week_number)**
- **NO unique constraint on (player_id, week_number, league_year)**

**Why This Causes Error:**
When Supabase/PostgreSQL tries to resolve `onConflict: 'player_id,week_number'`, it looks for a unique constraint on those columns. When it doesn't find one, it returns error PGRST204 "Invalid request format".

---

### Issue #2: Team Selection Overwrites Attendance

**Problem:**
When players mark their attendance, the code deletes ALL attendance records for that week, including the captain's team selection.

**Location:** `/src/routes/attendance/+page.svelte` line 202-206

```typescript
// This DELETE removes ALL records, including selected=true!
const { error: deleteError } = await supabase
  .from('attendance')
  .delete()
  .eq('week_number', currentWeek)
  .eq('league_year', '2025/26');
```

**Impact:**
1. Player marks attendance for week 5
2. Captain selects team (sets `selected=true` for 7 players)
3. Another player marks their attendance
4. **ALL attendance records deleted** (including captain's selection)
5. New records inserted with `selected=false` for everyone
6. **Team selection is lost!**

---

### Issue #3: Duplicate Attendance Records Possible

**Problem:**
Without a unique constraint, the database can accumulate duplicate attendance records.

**Scenario:**
1. Player marks available for week 5 → Record A created
2. Player changes to unavailable → Delete-then-insert creates Record B
3. But if delete fails, both Record A and B exist
4. Team selection page sees TWO records for same player+week
5. Filter logic gets confused: `attendance.find(a => a.player_id === p.id)` returns first match
6. Second record is ignored/orphaned

---

### Issue #4: No Transaction Safety

**Problem:**
The delete-then-insert pattern is not atomic.

```typescript
// STEP 1: Delete
await supabase.from('attendance').delete()...

// STEP 2: Insert
await supabase.from('attendance').insert(records)
```

**Failure Scenarios:**
- Delete succeeds, insert fails → ALL attendance lost
- Delete fails, insert succeeds → Duplicate records
- Connection drops between operations → Inconsistent state

---

## Data Flow Analysis

### Current Attendance Save Flow

```
1. User clicks "Save Changes"
   ↓
2. saveAttendance() called
   ↓
3. DELETE FROM attendance WHERE week_number = X
   ↓
4. INSERT INTO attendance (all players with current status)
   ↓
5. All records now have selected = false
   ↓
6. ❌ Captain's team selection is wiped out!
```

### Current Team Selection Flow

```
1. Team selection page loads
   ↓
2. teamStore.generateTeamSelection(weekNumber) called
   ↓
3. DashboardService.getWeeklyAttendance(weekNumber) called
   ↓
4. Query: SELECT * FROM attendance WHERE week_number = ?
   ↓
5. If duplicates exist, .find() returns first match
   ↓
6. Player availability based on that first match
   ↓
7. ❌ Possible wrong availability if duplicates have different values
```

---

## Solutions

### Option 1: Add Database Constraint (RECOMMENDED)

**Action:** Create unique constraint in database

```sql
ALTER TABLE attendance
ADD CONSTRAINT unique_player_week_year
UNIQUE (player_id, week_number, league_year);
```

**Then update code:**
```typescript
await supabase
  .from('attendance')
  .upsert(records, {
    onConflict: 'player_id,week_number,league_year'
  });
```

**Pros:**
- ✅ Prevents duplicates at database level
- ✅ Allows clean upsert logic
- ✅ Standard SQL approach
- ✅ Best practice

**Cons:**
- ❌ Requires database migration
- ❌ Need to clean existing duplicates first

---

### Option 2: Preserve Selection During Save

**Action:** Only update `available` field, don't delete records

```typescript
async function saveAttendance() {
  // For each player, update or insert individually
  for (const player of players) {
    const available = attendance.get(player.id) ?? true;

    // Try to update existing record
    const { data: updated } = await supabase
      .from('attendance')
      .update({ available })
      .eq('player_id', player.id)
      .eq('week_number', currentWeek)
      .eq('league_year', '2025/26')
      .select();

    // If no record existed, insert new one
    if (!updated || updated.length === 0) {
      await supabase
        .from('attendance')
        .insert({
          player_id: player.id,
          week_number: currentWeek,
          league_year: '2025/26',
          available,
          selected: false
        });
    }
  }
}
```

**Pros:**
- ✅ Preserves `selected` field
- ✅ No database changes needed
- ✅ Works with current schema

**Cons:**
- ❌ Multiple database calls (slower)
- ❌ Still doesn't prevent duplicates
- ❌ No transaction safety

---

### Option 3: Remove onConflict Parameter

**Action:** Let Supabase handle conflicts automatically

```typescript
await supabase
  .from('attendance')
  .upsert(records);  // No onConflict parameter
```

**How it works:**
Supabase will use the PRIMARY KEY (id) to detect conflicts. Since we're not providing `id` in our inserts, every call creates new records.

**Pros:**
- ✅ No immediate error
- ✅ Simple code change

**Cons:**
- ❌ Creates duplicate records EVERY time
- ❌ Database fills with garbage data
- ❌ Terrible solution - DO NOT USE

---

### Option 4: Use Supabase RPC for Transaction

**Action:** Create PostgreSQL function for atomic save

```sql
CREATE OR REPLACE FUNCTION save_attendance_safe(
  p_week_number INTEGER,
  p_league_year VARCHAR,
  p_records JSONB
)
RETURNS void AS $$
BEGIN
  -- Update existing records
  UPDATE attendance
  SET available = (p_records->>player_id::text)::boolean
  WHERE week_number = p_week_number
    AND league_year = p_league_year
    AND player_id = ANY(SELECT jsonb_array_elements_text(p_records));

  -- Insert new records
  INSERT INTO attendance (player_id, week_number, league_year, available, selected)
  SELECT
    (value->>'player_id')::uuid,
    p_week_number,
    p_league_year,
    (value->>'available')::boolean,
    false
  FROM jsonb_array_elements(p_records)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

**Pros:**
- ✅ Atomic transaction
- ✅ Preserves selection
- ✅ Prevents duplicates
- ✅ Best performance

**Cons:**
- ❌ Requires database function
- ❌ More complex to maintain
- ❌ Need Supabase RPC access

---

## Recommended Solution

**Best approach: Option 1 + Option 2 Combined**

1. **Database Migration:**
   ```sql
   -- Remove any duplicates first
   DELETE FROM attendance a
   USING attendance b
   WHERE a.id < b.id
     AND a.player_id = b.player_id
     AND a.week_number = b.week_number
     AND a.league_year = b.league_year;

   -- Add unique constraint
   ALTER TABLE attendance
   ADD CONSTRAINT unique_player_week_year
   UNIQUE (player_id, week_number, league_year);
   ```

2. **Update attendance page save:**
   ```typescript
   async function saveAttendance() {
     const records = players.map(player => ({
       player_id: player.id,
       week_number: currentWeek,
       league_year: '2025/26',
       available: attendance.get(player.id) ?? true
       // Don't include 'selected' - let database keep existing value
     }));

     const { error } = await supabase
       .from('attendance')
       .upsert(records, {
         onConflict: 'player_id,week_number,league_year',
         // Only update the 'available' column, ignore others
         ignoreDuplicates: false
       });
   }
   ```

3. **Update dashboardService.ts:**
   ```typescript
   async saveAttendance(records: Partial<AttendanceRecord>[]): Promise<void> {
     await retryDatabaseOperation(async () => {
       const { error } = await supabase
         .from('attendance')
         .upsert(records, {
           onConflict: 'player_id,week_number,league_year'
         });

       if (error) throw error;
     });
   }
   ```

---

## Testing Steps

After implementing fix:

1. **Test Duplicate Prevention:**
   - Mark attendance twice for same player/week
   - Verify only one record in database

2. **Test Selection Preservation:**
   - Captain selects team
   - Player marks attendance
   - Verify team selection still intact

3. **Test Error Handling:**
   - Disconnect internet
   - Try to save attendance
   - Verify graceful error message

4. **Test Multi-User:**
   - Two users mark attendance simultaneously
   - Verify no race conditions or lost data

---

## Files That Need Changes

1. `/src/routes/attendance/+page.svelte` - Update saveAttendance()
2. `/src/lib/services/dashboardService.ts` - Fix onConflict parameter
3. Database - Add unique constraint
4. `/src/lib/database/services/attendance.ts` - Review all methods

---

## Database Schema Issues

Current schema:
```sql
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  league_year character varying,
  week_number integer NOT NULL,
  available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_player_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
```

Missing:
- ❌ `selected` column (needed for team selection)
- ❌ Unique constraint on (player_id, week_number, league_year)
- ❌ NOT NULL constraint on critical fields
- ❌ Index on (week_number) for query performance

Recommended schema:
```sql
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  league_year varchar(10) NOT NULL,  -- Make NOT NULL
  week_number integer NOT NULL,
  available boolean NOT NULL DEFAULT true,
  selected boolean NOT NULL DEFAULT false,  -- Add this
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),  -- Track changes
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_player_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  CONSTRAINT unique_player_week_year UNIQUE (player_id, week_number, league_year)  -- Add this
);

CREATE INDEX idx_attendance_week ON attendance(week_number);
CREATE INDEX idx_attendance_player ON attendance(player_id);
```

---

## Summary

**The error occurs because:**
The code tries to use `onConflict: 'player_id,week_number'` but that constraint doesn't exist in the database, causing PostgreSQL to return error PGRST204.

**The fix requires:**
1. Adding unique constraint to database
2. Updating save logic to preserve team selection
3. Cleaning up any existing duplicate records

**Until fixed:**
Every attendance save risks duplicates and wipes out team selection.
