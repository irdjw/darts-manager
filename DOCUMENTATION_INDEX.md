# Documentation Index - Complete Code Annotations

This index tracks all files that have been fully annotated with teaching-style documentation.

## Legend
- ✅ Fully annotated with comprehensive explanations
- 📝 Partially annotated
- ❌ Not yet annotated

---

## Core System Files

### Configuration & Setup
- ❌ `svelte.config.js` - SvelteKit configuration
- ❌ `vite.config.ts` - Vite build configuration
- ❌ `tailwind.config.js` - Tailwind CSS setup
- ❌ `tsconfig.json` - TypeScript configuration
- ❌ `package.json` - Dependencies and scripts

### Server & Authentication
- ✅ `src/hooks.server.ts` - Request interceptor, auth middleware (COMPLETE)
- ✅ `src/app.d.ts` - Global type declarations (COMPLETE)

---

## Routes (Pages) - 25+ files

### Root Level
- ❌ `src/routes/+layout.svelte` - Main app shell
- ❌ `src/routes/+layout.server.ts` - Session management
- ❌ `src/routes/+layout.ts` - Client-side layout
- ❌ `src/routes/+page.svelte` - Homepage
- ❌ `src/routes/+page.server.ts` - Homepage server logic
- ❌ `src/routes/+error.svelte` - Error page

### Authentication
- ❌ `src/routes/auth/+page.svelte` - Login/signup page
- ❌ `src/routes/login/+page.svelte` - Login page
- ❌ `src/routes/logout/+page.svelte` - Logout handler

### Main Features
- ✅ `src/routes/attendance/+page.svelte` - Mark player availability (COMPLETE)
- ✅ `src/routes/dashboard/+page.svelte` - Main dashboard (COMPLETE)
- ❌ `src/routes/statistics/+page.svelte` - Player statistics
- ❌ `src/routes/scoring/[id]/+page.svelte` - Live scoring interface
- ✅ `src/routes/team-selection/+page.svelte` - Team selection root (COMPLETE)
- ✅ `src/routes/team-selection/[week]/+page.svelte` - Weekly team selection (COMPLETE)
- ❌ `src/routes/match/[id]/+page.svelte` - Match details
- ❌ `src/routes/custom-match/+page.svelte` - Custom match setup
- ❌ `src/routes/warmup/+page.svelte` - Warmup session
- ✅ `src/routes/team/+page.svelte` - Team management (COMPLETE)
- ❌ `src/routes/offline/+page.svelte` - Offline fallback

### Admin
- ❌ `src/routes/admin/+page.svelte` - Admin dashboard
- ❌ `src/routes/admin/+page.server.ts` - Admin auth check
- ❌ `src/routes/admin/results/+page.svelte` - Results management
- ❌ `src/routes/admin/personal/+page.svelte` - Personal scoring
- ❌ `src/routes/admin/emergency/+page.svelte` - Emergency functions

---

## Components (UI) - 29 files

### Core Scoring Components
- ✅ `src/lib/components/MobileDartEntry.svelte` - **CRITICAL** Main scoring interface (COMPLETE - 1444 lines)
- ✅ `src/lib/components/NumberGrid.svelte` - Number pad for dart entry (COMPLETE - 543 lines)
- ❌ `src/lib/components/GameCompleteModal.svelte` - End of game modal
- ❌ `src/lib/components/DartVisualIndicators.svelte` - Visual dart display
- ❌ `src/lib/components/CheckoutSuggestions.svelte` - Finish suggestions
- ❌ `src/lib/components/CheckoutDisplay.svelte` - Checkout display
- ❌ `src/lib/components/scoringEngine.svelte` - Legacy scoring engine

### Player & Team Components
- ❌ `src/lib/components/PlayerCard.svelte` - Player display card
- ❌ `src/lib/components/MatchCard.svelte` - Match fixture card
- ❌ `src/lib/components/StatsCard.svelte` - Statistics card

### Statistics Components
- ❌ `src/lib/components/LiveDartStats.svelte` - Real-time stats during game
- ❌ `src/lib/components/PersonalStatsTracker.svelte` - Personal practice stats
- ❌ `src/lib/components/PersonalStatsDashboard.svelte` - Personal stats dashboard
- ❌ `src/lib/components/PersonalGoalTracker.svelte` - Goal tracking

### Practice Components
- ❌ `src/lib/components/PersonalPracticeHub.svelte` - Practice session hub
- ❌ `src/lib/components/CustomMatchSetup.svelte` - Custom match setup

### Form Components
- ❌ `src/lib/components/LoginForm.svelte` - Login form
- ❌ `src/lib/components/GuestPlayerForm.svelte` - Guest player form

### UI Helpers
- ❌ `src/lib/components/QuickActions.svelte` - Dashboard quick actions
- ❌ `src/lib/components/MobileNavigation.svelte` - Mobile navigation
- ❌ `src/lib/components/KeyboardHelp.svelte` - Keyboard shortcuts help
- ❌ `src/lib/components/LazyLoad.svelte` - Lazy loading wrapper
- ❌ `src/lib/components/LoadingSpinner.svelte` - Loading indicator
- ❌ `src/lib/components/ErrorAlert.svelte` - Error display
- ❌ `src/lib/components/ErrorBoundary.svelte` - Error boundary

### UI Component Library
- ❌ `src/lib/components/ui/button.svelte` - Button component
- ❌ `src/lib/components/ui/Card.svelte` - Card component
- ❌ `src/lib/components/ui/LoadingSpinner.svelte` - Loading spinner
- ❌ `src/lib/components/ui/Modal.svelte` - Modal component

---

## Stores (State Management) - 5 files

- ✅ `src/lib/stores/scoringStores.ts` - **CRITICAL** Game scoring state (COMPLETE - 1555 lines fully annotated)
- ✅ `src/lib/stores/auth.ts` - Authentication state (COMPLETE)
- ✅ `src/lib/stores/dashboard.ts` - Dashboard data (COMPLETE)
- ✅ `src/lib/stores/players.ts` - Player management (COMPLETE)
- ✅ `src/lib/stores/teamManagement.ts` - Team selection (COMPLETE)

---

## Services (Business Logic) - 6 files

- ✅ `src/lib/services/checkoutService.ts` - **CRITICAL** Checkout calculations (COMPLETE - 711 lines)
- ✅ `src/lib/services/statisticsService.ts` - **CRITICAL** Statistics calculations (COMPLETE)
- ❌ `src/lib/services/dartTrackingService.ts` - Dart tracking
- ❌ `src/lib/services/customMatchService.ts` - Custom match operations
- ❌ `src/lib/services/personalGameService.ts` - Personal practice games
- ✅ `src/lib/services/dashboardService.ts` - Dashboard data (COMPLETE)

---

## Database Layer

### Core Database Files
- ✅ `src/lib/database/supabase.ts` - Database connection (COMPLETE)
- ✅ `src/lib/database/types.ts` - **IMPORTANT** All database types (COMPLETE)
- ✅ `src/lib/database/errors.ts` - Error handling (COMPLETE)

### Database Services
- ✅ `src/lib/database/services/players.ts` - Player CRUD (COMPLETE)
- ✅ `src/lib/database/services/fixtures.ts` - Fixture CRUD (COMPLETE)
- ✅ `src/lib/database/services/games.ts` - Game result CRUD (COMPLETE)
- ✅ `src/lib/database/services/attendance.ts` - Attendance CRUD (COMPLETE)
- ✅ `src/lib/database/services/index.ts` - Service exports (COMPLETE)

---

## Types (TypeScript Definitions) - 4 files

- ✅ `src/lib/types/scoring.ts` - **CRITICAL** Scoring type definitions (COMPLETE - 689 lines)
- ❌ `src/lib/types/dashboard.ts` - Dashboard types
- ❌ `src/lib/types/components.ts` - Component prop types
- ❌ `src/lib/types/customMatch.ts` - Custom match types

---

## Utilities - 9 files

- ✅ `src/lib/utils/supabase-browser.ts` - Browser Supabase client (COMPLETE)
- ✅ `src/lib/utils/supabaseHealth.ts` - Database health checks (COMPLETE)
- ✅ `src/lib/utils/cache.ts` - Client-side caching (COMPLETE)
- ✅ `src/lib/utils/constants.ts` - Application constants (COMPLETE)
- ✅ `src/lib/utils/formatting.ts` - Data formatting (COMPLETE)
- ✅ `src/lib/utils/helpers.ts` - General helpers (COMPLETE)
- ✅ `src/lib/utils/keyboard.ts` - Keyboard event handling (COMPLETE)
- ✅ `src/lib/utils/performance.ts` - Performance monitoring (COMPLETE)
- ✅ `src/lib/utils/pwa.ts` - PWA utilities (COMPLETE)

---

## Static Assets

- ❌ `static/manifest.json` - PWA manifest
- ❌ `static/service-worker.js` - Service worker for offline

---

## Test Files - 3 files

- ❌ `tests/setup.ts` - Test configuration
- ❌ `tests/components/QuickActions.test.ts` - Component tests
- ❌ `tests/utils/cache.test.ts` - Utility tests

---

## Documentation Files

- ✅ `SYSTEM_OVERVIEW.md` - Complete system explanation (DONE)
- ✅ `ATTENDANCE_ISSUES_ANALYSIS.md` - Attendance bug analysis (DONE)
- ❌ `ISSUES.md` - Known issues
- ❌ `README.md` - Project readme
- ❌ `docs/DATABASE_SCHEMA.sql` - Database schema
- ❌ `docs/fix.md` - Fix documentation
- ❌ `docs/final_fixes_cli_prompt.md` - Fix prompts

---

## Priority for Annotation

### Phase 1: Core Functionality (Tonight's Game)
1. **`scoringStores.ts`** - Heart of the application
2. **`MobileDartEntry.svelte`** - Main scoring UI
3. **`NumberGrid.svelte`** - Dart input
4. **`checkoutService.ts`** - Finish calculations
5. **`statisticsService.ts`** - Stats calculations
6. **`games.ts` database service** - Save results
7. **Scoring types** - Data structures

### Phase 2: Team Management ✅ COMPLETE
8. ✅ **`attendance.ts` database service** - Attendance CRUD
9. ✅ **`teamManagement.ts` store** - Selection logic
10. ✅ **Team selection pages** - All 4 UI pages annotated
11. ✅ **`games.ts` database service** - Game result CRUD (Phase 1 completion)

### Phase 3: Supporting Systems ✅ COMPLETE
11. ✅ **Dashboard components** - Navigation
12. ✅ **Authentication** - Login/logout
13. ✅ **Database types** - All interfaces
14. ✅ **Utilities** - All 9 utility files

### Phase 4: Everything Else
15. **Remaining components**
16. **Admin pages**
17. **Configuration files**
18. **Tests**

---

## Code Duplication Report

### Areas with Duplicate Logic

1. **Player Queries**
   - `PlayersService.getAll()` in database/services/players.ts
   - `DashboardService.getAllPlayers()` in services/dashboardService.ts
   - DUPLICATE: Same query, different locations

2. **Attendance Save**
   - Delete-then-insert in routes/attendance/+page.svelte
   - Upsert with onConflict in services/dashboardService.ts
   - Check-update-or-insert in database/services/attendance.ts
   - DUPLICATE: Three different approaches to same operation

3. **Fixture Queries**
   - Hardcoded '2025/26' league year in 10+ places
   - DUPLICATE: Should be centralized constant

4. **Error Handling**
   - Try/catch blocks repeated in every database function
   - DUPLICATE: Should use wrapper/decorator pattern

5. **Database Connection**
   - Multiple Supabase client creations
   - May cause connection pool issues

---

## Completed Phases

### Phase 1: Core Scoring System ✅ COMPLETE (7 files)
- scoringStores.ts (1555 lines)
- scoring.ts types (689 lines)
- MobileDartEntry.svelte (1444 lines)
- NumberGrid.svelte (543 lines)
- checkoutService.ts (711 lines)
- statisticsService.ts (645 lines)
- games.ts database service

### Phase 2: Team Management ✅ COMPLETE (6 files)
- attendance.ts database service
- teamManagement.ts store
- team/+page.svelte (captain dashboard, 4 tabs)
- team-selection/+page.svelte (auto-redirect router)
- team-selection/[week]/+page.svelte (dedicated selection)
- attendance/+page.svelte (player availability marking)

### Phase 3: Supporting Systems ✅ COMPLETE (20 files)
**Stores (3):** auth.ts, players.ts, dashboard.ts
**Core (2):** app.d.ts, hooks.server.ts
**Database (6):** supabase.ts, types.ts, errors.ts, players.ts, fixtures.ts, index.ts
**Services (1):** dashboardService.ts
**Routes (1):** dashboard/+page.svelte
**Utilities (9):** constants, formatting, helpers, cache, keyboard, performance, pwa, supabaseHealth, supabase-browser

## Next Steps

### Phase 4: Everything Else (remaining ~50 files)
- Remaining components (25 files): PlayerCard, MatchCard, StatsCard, LoginForm,
  MobileNavigation, QuickActions, LoadingSpinner, ErrorAlert, ErrorBoundary, etc.
- Route pages (16 files): statistics, scoring, match, custom-match, warmup,
  login, logout, auth, admin (5 pages), offline, root layout
- Server/layout logic (8 files): +page.server.ts files, +layout.ts/server.ts
- Types (3 files): dashboard.ts, components.ts, customMatch.ts
- Services (3 files): dartTrackingService, customMatchService, personalGameService
- Configuration (5 files): svelte.config, vite.config, tailwind.config, tsconfig, package.json
- Tests (3 files)
- Static assets (2 files): manifest.json, service-worker.js

**Bugs & duplications flagged during annotation (all Phases):**
- Attendance save: 3 different approaches (delete-then-insert, upsert, check-update-or-insert)
- Player queries duplicated between PlayersService and DashboardService
- league_year '2025/26' hardcoded in 10+ places
- DashboardService exists in TWO files (src/lib/services/ and src/lib/stores/)
- Error handling exists in TWO forms: handleDatabaseError() returns strings, DatabaseErrorHandler returns objects
- Supabase clients: THREE instances (supabase.ts createClient, supabase-browser.ts createBrowserClient, hooks.server.ts createServerClient)
- Health checks: TWO implementations (supabase.ts checkDatabaseHealth, supabaseHealth.ts SupabaseHealthCheck)
- helpers.ts contains dead commented-out code block (lines 163–315) — SSR-unsafe duplicates
- keyboard.ts stopListening() has a .bind() bug — listener is never actually removed
- players.ts getAvailablePlayers() queries attendance table but types result as Player[]
- players.ts updatePlayerStats() drop_week calculation always returns null
- team-selection/[week]/+page.svelte saveTeamSelection() only console.logs — never persists
