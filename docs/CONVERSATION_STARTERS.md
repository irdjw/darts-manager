# Conversation Starter Templates

## Chat 1: Foundation Layer

```
I'm ready to start the foundation layer restructure for the Isaac Wilson Darts Team app using SvelteKit + TypeScript + TailwindCSS. Please build:

1. **TypeScript Database Service Layer** - Consolidate all Supabase operations for SvelteKit
2. **Multi-Team Theme System** - TailwindCSS with CSS variables for team customization  
3. **Shared Svelte Components** - Card, Button, Modal, LoadingSpinner with mobile-first design
4. **Svelte Stores** - State management for authentication and app data
5. **Constants and Configuration** - Centralized app configuration

**Key Requirements:**
- Mobile-first design with TailwindCSS (70% mobile users)
- SvelteKit + TypeScript throughout for multi-team scalability
- No database schema changes (keep existing Supabase)
- CSS variables + TailwindCSS for team theming (not styled-components)
- Prepare for 20-team league expansion

**Technology Stack:**
- SvelteKit + TypeScript (60% smaller bundles than React)
- TailwindCSS for styling and responsive design
- Svelte stores for state management
- Netlify for deployment

Use the project requirements document and current codebase as reference.
```

## Chat 2: Authentication System

```
Ready for the authentication system restructure using SvelteKit patterns. Build the complete TypeScript auth architecture:

1. **Auth Svelte Store** - Reactive authentication state management
2. **Protected Route Components** - SvelteKit route guards with permission checks
3. **Mobile-Optimized Login Form** - Touch-friendly Svelte component with TailwindCSS
4. **Multi-Team Permission System** - Support for Super Admin → League Admin → Team Admin → Captain → Player hierarchy
5. **User Management Components** - Role assignment and team association

**SvelteKit Patterns:**
- Use Svelte stores for authentication state
- Implement route protection with SvelteKit load functions
- Mobile-first forms with TailwindCSS classes
- Reactive UI updates with Svelte's built-in reactivity

**User Hierarchy (Multi-Team Future):**
- Super Admin (me)
- League Admin 
- Team Admin (backup coverage)
- Team Captain (primary management)
- Players (team members)

**Mobile Requirements:**
- Touch-friendly form elements (min-h-[44px] TailwindCSS classes)
- Responsive design for 70% mobile users
- Fast authentication flow with optimistic updates

Reference the user management requirements in the project documentation.
```

## Chat 3: Scoring Engine Consolidation

```
Time to consolidate the three scoring systems into one unified SvelteKit + TypeScript scoring engine:

**Current Systems to Replace:**
- DartsScorer.js (enhanced scoring with checkout detection)
- DartByDartEntry.js (detailed dart-by-dart tracking)  
- GameScoring.js (basic leg recording)

**Build Unified Svelte System:**
1. **ScoringEngine.svelte** - Main scoring component with multiple modes
2. **Mobile-First Input Interface** - Touch-optimized dart entry with TailwindCSS
3. **Comprehensive Checkout Detection** - TypeScript service for all possible checkouts
4. **Statistics Calculation Service** - Real-time averages and percentages
5. **Game History Store** - Svelte store for detailed throw-by-throw records

**SvelteKit Patterns:**
- Reactive scoring updates with Svelte stores
- Component composition with slot props
- Mobile-first TailwindCSS grid layouts
- TypeScript interfaces for all scoring data

**Scoring Modes Required:**
- League matches (501, double-out, leg tracking)
- Practice games (statistics tracking)
- Warm-up tournaments (simple win/loss)

**Mobile Optimizations:**
- Large touch targets with TailwindCSS (min-h-[44px])
- Swipe gestures for navigation
- Grid layouts for number entry (grid-cols-3 md:grid-cols-4)
- Offline capability with Svelte stores

Maintain all current scoring functionality while consolidating into one Svelte system.
```

## Chat 4: Dashboard & Team Management

```
Ready for dashboard and team management component restructure using SvelteKit + TailwindCSS:

**Dashboard Components:**
1. **Mobile-First Dashboard Layout** - SvelteKit route with responsive TailwindCSS grid
2. **MatchCard Component** - Current fixture with team selection status
3. **StatsCard Components** - Season overview and player performance with reactive updates
4. **Quick Actions** - Touch-optimized navigation with TailwindCSS buttons

**Team Management:**
1. **Optimized Team Selection Logic** - Svelte stores for auto-selection rules + captain override
2. **Attendance Tracking** - Weekly availability with reactive UI updates  
3. **Player List Components** - Mobile-friendly displays with TailwindCSS grid
4. **Match Flow Coordination** - Attendance → Team Selection → Games → Results

**SvelteKit Patterns:**
- Use SvelteKit routes for navigation (src/routes/dashboard/+page.svelte)
- Reactive data updates with Svelte stores
- Mobile-first TailwindCSS classes (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Touch-optimized interactions with proper sizing

**Key Business Rules:**
- 7-player team selection from available players
- Winners auto-selected from previous week
- 2+ consecutive losses = sit out next week
- Captain can override rules for first week

**Mobile UX Priority (TailwindCSS):**
- Card-based layout with proper spacing (p-4 md:p-6)
- Touch-friendly buttons (min-h-[44px] px-6 py-3)
- Simplified navigation for small screens
- Status indicators with color coding (bg-green-500, bg-red-500)

Focus on mobile experience for 70% of users while maintaining all current functionality.
```

## Chat 5: Integration & Final Assembly

```
Final integration phase - complete the SvelteKit restructure:

**Integration Tasks:**
1. **SvelteKit App Structure** - Clean route organization and layout system
2. **Mobile-Optimized Navigation** - SvelteKit routing with TailwindCSS responsive design
3. **Performance Optimizations** - Code splitting, lazy loading, Svelte's built-in optimizations
4. **Migration Guide** - Step-by-step replacement of old React system

**Final SvelteKit Architecture:**
- TypeScript throughout with proper interfaces
- Mobile-first responsive design with TailwindCSS
- CSS variables for multi-team theming
- Consolidated scoring engine with Svelte components
- Svelte stores for state management
- Multi-team ready structure

**Deployment Readiness:**
- Netlify optimization with proper redirects
- Progressive Web App foundation
- Offline capability with Svelte stores
- Performance monitoring setup

**SvelteKit Specific Optimizations:**
- Route-based code splitting (automatic)
- Server-side rendering for faster initial loads
- Hydration optimization
- Bundle size optimization (already 60% smaller than React)

**Success Criteria:**
- 62% bundle size reduction (800KB vs 2.1MB original)
- 65% faster load times (1.1s vs 3.2s original)
- 67% improved code reuse
- Zero functional regression
- Multi-team scalability ready

Provide complete migration instructions and Netlify deployment guide for the restructured SvelteKit system.
```

**Final Architecture:**
- SvelteKit + TypeScript throughout
- Mobile-first responsive design with TailwindCSS
- CSS variables for multi-team theming
- Consolidated scoring engine with Svelte components
- Svelte stores for state management
- Multi-team ready structure

**Deployment Readiness:**
- Netlify optimization with proper redirects
- Progressive Web App foundation
- Offline capability with Svelte stores
- Performance monitoring setup

**SvelteKit Specific Optimizations:**
- Route-based code splitting (automatic)
- Server-side rendering for faster initial loads
- Hydration optimization
- Bundle size optimization (already 60% smaller than React)

**Success Criteria:**
- 62% bundle size reduction (800KB vs 2.1MB original)
- 65% faster load times (1.1s vs 3.2s original)
- 67% improved code reuse
- Zero functional regression
- Multi-team scalability ready

Provide complete migration instructions and Netlify deployment guide for the restructured SvelteKit system.
```

## Pre-Chat Reminders

### Before Each Conversation:
- [ ] Reference PROJECT_REQUIREMENTS.md for complete specifications
- [ ] Check current codebase for existing implementation details
- [ ] Remember mobile-first priority (70% mobile users)
- [ ] Maintain multi-team scalability throughout
- [ ] Ensure TypeScript best practices

### Key Context Points:
- **No database changes allowed** - work with existing schema
- **Preserve all historical data** - no data migration issues
- **Zero functional regression** - maintain all current workflows
- **38 fixtures × 7 games = 266 games per team per season**
- **Future: 20 teams × 5,320 league games per season**

### Testing After Each Chat:
- [ ] Verify mobile responsiveness
- [ ] Check TypeScript compilation
- [ ] Test with existing data structure
- [ ] Confirm no functionality lost
- [ ] Document any integration requirements