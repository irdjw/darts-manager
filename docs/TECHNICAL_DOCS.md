# Isaac Wilson Darts Team Manager - Technical Documentation

## Architecture Overview

This application is built using modern web technologies with a focus on performance, accessibility, and mobile-first design.

### Tech Stack

- **Frontend**: SvelteKit 5 with TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel/Netlify (or similar)
- **PWA**: Service Worker + Web App Manifest

### Key Features

- ✅ **Progressive Web App** - Installable, offline-capable
- ✅ **Role-Based Access Control** - Player/Captain/Admin/Super Admin
- ✅ **Mobile-First Design** - Responsive, touch-friendly
- ✅ **Professional Scoring** - 501 double-in/double-out with statistics
- ✅ **Real-time Data** - Live match scoring and updates
- ✅ **Offline Support** - Cached data and practice mode
- ✅ **Accessibility** - Screen reader support, keyboard navigation
- ✅ **Performance Optimized** - Lazy loading, caching, code splitting

---

## Project Structure

```
src/
├── app.css                 # Global styles
├── app.html               # HTML template
├── hooks.server.ts        # Server-side hooks
├── lib/
│   ├── components/        # Reusable Svelte components
│   │   ├── ui/           # Basic UI components
│   │   ├── ErrorBoundary.svelte
│   │   ├── KeyboardHelp.svelte
│   │   ├── LazyLoad.svelte
│   │   ├── LoadingSpinner.svelte
│   │   ├── MobileNavigation.svelte
│   │   ├── PlayerCard.svelte
│   │   ├── QuickActions.svelte
│   │   └── scoringEngine.svelte
│   ├── database/          # Database utilities
│   │   ├── supabase.ts
│   │   └── types.ts
│   ├── services/          # Business logic services
│   │   └── dashboardService.ts
│   ├── stores/            # Svelte stores
│   │   ├── auth.ts
│   │   └── teamManagement.ts
│   ├── types/             # TypeScript type definitions
│   │   ├── dashboard.ts
│   │   └── scoring.ts
│   └── utils/             # Utility functions
│       ├── cache.ts       # Data caching
│       ├── formatting.ts  # Display formatting
│       ├── keyboard.ts    # Keyboard shortcuts
│       ├── performance.ts # Performance monitoring
│       └── pwa.ts         # PWA utilities
├── routes/                # SvelteKit routes
│   ├── +layout.svelte    # Root layout
│   ├── +layout.server.ts # Server layout
│   ├── +error.svelte     # Error page
│   ├── admin/            # Admin dashboard
│   ├── attendance/       # Attendance marking
│   ├── auth/            # Authentication
│   ├── dashboard/       # Main dashboard
│   ├── logout/          # Logout handling
│   ├── match/[id]/      # Match management
│   ├── offline/         # Offline page
│   ├── scoring/[id]/    # Game scoring
│   ├── statistics/      # Performance stats
│   ├── team/           # Team management
│   ├── team-selection/ # Team selection
│   └── warmup/         # Practice mode
└── static/
    ├── manifest.json      # PWA manifest
    ├── service-worker.js  # Service worker
    └── icons/            # App icons
```

---

## Component Architecture

### Core Components

#### ErrorBoundary.svelte
Comprehensive error handling with:
- Automatic error catching
- User-friendly error display
- Technical details toggle
- Retry functionality
- Error reporting integration

#### LazyLoad.svelte
Intersection Observer-based lazy loading:
- Configurable offset and height
- Skeleton loading states
- Performance optimization

#### MobileNavigation.svelte
Role-based mobile navigation:
- Slide-out drawer
- Role-specific menu items
- Accessibility features

#### QuickActions.svelte
Dynamic action cards based on user role:
- Responsive grid layout
- Role-based filtering
- Visual feedback on hover

#### scoringEngine.svelte
Professional 501 darts scoring:
- Double-in/double-out rules
- Real-time statistics
- Turn-based score tracking
- Game completion detection

---

## Data Management

### Caching Strategy

The application implements a multi-level caching system:

```typescript
// Memory cache for temporary data
export const memoryCache = new Cache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  storage: 'memory'
});

// Session cache for user session data
export const sessionCache = new Cache({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 50,
  storage: 'sessionStorage'
});

// Persistent cache for long-term data
export const dataCache = new Cache({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 100,
  storage: 'localStorage'
});
```

### Cache Patterns

1. **Cache Aside**: Check cache first, fetch if miss
2. **Write Through**: Write to source, then cache
3. **Write Behind**: Cache immediately, write async
4. **Refresh Ahead**: Background refresh before expiry

### Optimistic Updates

```typescript
await cache.optimisticUpdate(
  'attendance-week-1',
  updatedAttendance,
  async () => await saveToDatabase(updatedAttendance),
  (error) => console.error('Update failed:', error)
);
```

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

```typescript
// Route protection
export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();
  const userRole = session.user.user_metadata?.role || 'player';
  
  if (!['captain', 'admin', 'super_admin'].includes(userRole)) {
    throw error(403, 'Access denied: Captain privileges required');
  }
  
  return { userRole, session };
};
```

### Permission Hierarchy

- **Super Admin** → Full system access
- **Admin** → Captain permissions + admin panel
- **Captain** → Player permissions + team management
- **Player** → Basic features (attendance, stats, practice)

---

## Progressive Web App (PWA)

### Service Worker Features

- **Caching Strategy**: Network-first with cache fallback
- **Offline Support**: Essential pages cached
- **Background Sync**: Offline data synchronization
- **Push Notifications**: Match reminders (optional)

### Manifest Configuration

```json
{
  "name": "Isaac Wilson Darts Team Manager",
  "short_name": "Darts Manager",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#f8fafc"
}
```

---

## Performance Optimizations

### Code Splitting
- Route-based code splitting via SvelteKit
- Dynamic imports for heavy components
- Lazy loading for non-critical features

### Image Optimization
- WebP format with fallbacks
- Responsive images with srcset
- Lazy loading with intersection observer

### Caching
- Multi-level cache hierarchy
- Automatic cache invalidation
- Background refresh strategies

### Bundle Analysis
- Tree shaking for unused code
- Component-level code splitting
- Resource preloading for critical paths

---

## Accessibility Features

### Keyboard Navigation
- Comprehensive keyboard shortcuts (Alt+H for help)
- Focus management and trap
- Skip links for screen readers

### Screen Reader Support
- Semantic HTML structure
- ARIA attributes and labels
- Live regions for dynamic content

### Visual Accessibility
- High contrast ratios
- Focus indicators
- Reduced motion support

---

## Testing Strategy

### Unit Testing
```typescript
// Component testing with Testing Library
import { render, screen } from '@testing-library/svelte';
import QuickActions from '$lib/components/QuickActions.svelte';

describe('QuickActions', () => {
  it('renders base actions for player role', () => {
    render(QuickActions, { userRole: 'player' });
    expect(screen.getByText('Attendance')).toBeInTheDocument();
  });
});
```

### Test Coverage
- Minimum 70% coverage threshold
- Components, utilities, and services
- E2E testing for critical flows

---

## Database Schema

### Core Tables

```sql
-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  win_percentage DECIMAL DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  drop_week INTEGER NULL,
  highest_checkout INTEGER DEFAULT 0,
  total_180s INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  week_number INTEGER NOT NULL,
  league_year TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  attended BOOLEAN DEFAULT FALSE,
  selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, week_number, league_year)
);

-- Fixtures
CREATE TABLE fixtures (
  id UUID PRIMARY KEY,
  week_number INTEGER NOT NULL,
  match_date DATE NOT NULL,
  opposition TEXT NOT NULL,
  venue TEXT CHECK (venue IN ('home', 'away')),
  result TEXT CHECK (result IN ('win', 'loss', 'to_play')),
  status TEXT CHECK (status IN ('completed', 'to_play', 'in_progress')),
  team_won BOOLEAN NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Deployment

### Environment Variables
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Build Process
```bash
# Install dependencies
npm install

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Hosting Requirements
- Node.js 18+ runtime
- Static file serving
- HTTPS required for PWA features

---

## Monitoring & Analytics

### Performance Monitoring
- Core Web Vitals tracking
- Bundle size analysis
- Cache hit rates
- Error tracking and reporting

### User Analytics
- Feature usage tracking
- Performance metrics
- Error rates and patterns

---

## Security Considerations

### Data Protection
- Row Level Security (RLS) in Supabase
- Server-side route protection
- Input validation and sanitization

### Authentication
- Secure session management
- Role-based access control
- Automatic logout on inactivity

### Content Security
- HTTPS enforcement
- Secure cookie settings
- XSS protection

---

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch

# Type checking
npm run check

# Linting
npm run lint
```

### Git Workflow
1. Feature branches from main
2. Pull request review process
3. Automated testing on PR
4. Merge to main triggers deployment

---

## API Integration

### Supabase Client
```typescript
export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);
```

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Automatic retry mechanisms
- Fallback offline functionality

---

## Future Enhancements

### Planned Features
- Real-time multiplayer scoring
- Advanced analytics dashboard
- Tournament bracket management
- Push notification system
- Voice input for scoring

### Technical Improvements
- GraphQL API layer
- Real-time subscriptions
- Advanced caching strategies
- Micro-frontends architecture

---

*This documentation is maintained alongside the codebase. For implementation details, refer to the source code and inline comments.*