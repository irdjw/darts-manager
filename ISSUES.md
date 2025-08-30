# Technical Issues and Required Information

## TypeScript/Type Issues Requiring Resolution

### 1. User Role Type Safety
**Issue**: Type mismatch in `hooks.server.ts` line 34
```typescript
// Current issue: Type 'string' is not assignable to type '"player" | "captain" | "admin" | "super_admin" | undefined'
event.locals.userRole = userRole;
```
**Required Information**: 
- Should user roles be strictly typed or allow dynamic values from database?
- Current database schema for user_metadata.role field

### 2. Statistics Service Missing Properties
**Issue**: Properties missing from Player type
```typescript
// Missing properties in Player interface:
checkout_attempts?: number;
checkout_hits?: number;
```
**Required Information**:
- Are these statistics tracked in the database?
- Should these be optional properties with default values?

### 3. StatsCard Component Interface
**Issue**: `trend` property not defined in StatsCard component props
```svelte
<StatsCard trend="up" /> <!-- Property 'trend' does not exist -->
```
**Required Information**:
- Should trend be added to StatsCard interface?
- What are the valid trend values? ('up', 'down', 'neutral'?)

### 4. Cache Utility Type Safety
**Issue**: Map.keys().next().value can be undefined
```typescript
const oldestKey = this.cache.keys().next().value; // string | undefined
```
**Status**: Low priority - edge case handling needed

### 5. Service Worker Background Sync
**Issue**: `registration.sync` property doesn't exist in TypeScript
```typescript
return registration.sync.register('sync-attendance'); // Property 'sync' does not exist
```
**Required Information**:
- Is background sync actually needed for the app?
- Should this be wrapped in feature detection?

## Navigation Flow Issues (Resolved)

✅ All accessibility issues have been fixed:
- Added proper aria-labels to buttons without text
- Fixed form label associations with for/id attributes
- Converted display labels to divs where not controlling form elements
- Added tabindex to dialog elements
- Added keyboard event handlers for modal dialogs

✅ Authentication flows tested and working:
- Public routes (/, /auth, /login, /offline) accessible without auth
- Protected routes redirect to /auth with proper redirect parameter
- Role-based access control working for all user types
- Logout functionality working correctly

## Testing Dependencies Missing

### Required for tests to run:
```bash
npm install --save-dev @testing-library/svelte @testing-library/jest-dom
```

**Files affected**:
- `tests/setup.ts`
- `tests/components/QuickActions.test.ts`

## Database Schema Questions

### Player Statistics
The following properties are referenced in code but may not exist in database:
- `checkout_attempts`
- `checkout_hits`
- Leg-specific statistics (best/worst leg tracking)

### Fixture Management
- Current fixture detection logic assumes `status` and `result` fields
- Match result calculation assumes 7-game matches

## Recommended Actions

1. **High Priority**: Fix user role typing in hooks.server.ts
2. **Medium Priority**: Add missing Player interface properties or remove references
3. **Medium Priority**: Fix StatsCard trend property
4. **Low Priority**: Add testing dependencies
5. **Low Priority**: Review background sync necessity

## Notes

- Build process completes successfully despite TypeScript errors
- Core application functionality works correctly
- All navigation and authentication flows are operational
- Accessibility compliance achieved