# Project Context

## Current Status
- **Live Application**: Isaac Wilson Darts Team management system
- **Technology Stack**: React + JavaScript + Supabase (PostgreSQL) + Netlify hosting
- **User Base**: ~14 team members with mobile-heavy usage (70% mobile, 20% tablet, 10% desktop)
- **Data Volume**: 1 complete season of match/player data with comprehensive dart-by-dart tracking
- **League Context**: Part of 20-team league structure with potential for league-wide adoption

## Current Architecture Issues
- **Code Redundancy**: 3 separate scoring systems with overlapping functionality
- **Maintenance Complexity**: Auth.js handles 6+ different responsibilities
- **Performance**: ~2.1MB bundle size with significant duplicate code
- **Scalability Concerns**: JavaScript codebase difficult to scale for multi-team usage
- **Mobile Experience**: Inline styles not optimized for mobile-first design

## Restructure Objectives

### Primary Goals
- **TypeScript Migration**: Complete conversion for type safety and multi-team scalability
- **Mobile-First Redesign**: Optimized UX for 70% mobile user base
- **Code Consolidation**: Reduce from 3 scoring systems to 1 unified system
- **Multi-Team Architecture**: Prepare for 20-team league expansion
- **Performance Optimization**: Target 33% bundle reduction, 44% faster load times

### Performance Targets
- **Bundle Size**: 2.1MB → 800KB (62% reduction - better than React target!)
- **Load Time**: 3.2s → 1.1s (65% improvement - much better than React)
- **Code Reuse**: 45% → 75% (67% increase)
- **Maintainability**: Medium → High (single responsibility + simpler architecture)
- **Mobile Performance**: Significant improvement with SvelteKit's optimizations

### Multi-Team Expansion Vision
- **Scale**: 20 teams × 38 fixtures × 7 games = 5,320 league games per season
- **Customization**: Team-specific branding and themes
- **Data Architecture**: League-wide statistics and league tables
- **User Management**: Hierarchical permissions across multiple teams

## Key Business Constraints

### Critical Requirements
- **Zero Functional Regression**: All existing workflows must be preserved exactly
- **No Database Changes**: Work with current Supabase schema without modifications
- **Historical Data Preservation**: All player statistics and match history must be maintained
- **User Experience Continuity**: Existing users should notice no workflow changes

### Business Logic (Must Preserve)
- **Team Selection Rules**: 7-player selection with auto-selection of previous winners
- **Drop System**: Players with 2+ consecutive losses sit out next week
- **Captain Override**: First week and special circumstance flexibility
- **Match Flow**: Attendance → Team Selection → Individual Games → Results
- **Statistics Tracking**: Win percentages, checkout statistics, dart-by-dart records

## User Hierarchy & Permissions

### Current Structure
- **Super Admin**: Full system access (you)
- **Admin**: Manage players/fixtures, view statistics
- **Captain**: Team selection, attendance, result recording
- **Player**: View stats, record games, warm-ups

### Future Multi-Team Structure
```
Super Admin (You)
├── League Admin (league-wide management)
└── Teams (20 teams)
    ├── Team Admin (backup coverage)
    ├── Team Captain (primary management)
    └── Players (team members)
```

## Technical Architecture

### Current Technology Decisions
- **Frontend**: React 18+ with Create React App
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Vercel (edge deployment, serverless functions)
- **Styling**: Inline styles with shared objects (to be upgraded)
- **State Management**: React Context + useState hooks

### New Restructure Technology Stack
- **Frontend**: SvelteKit + TypeScript (60% smaller bundles than React)
- **Styling**: TailwindCSS + CSS Variables (superior multi-team theming)
- **Deployment**: Netlify (more generous free tier than Vercel)
- **State Management**: Svelte stores (simpler than React Context)
- **Theme System**: CSS variables + TailwindCSS for team customization
- **Component Architecture**: Svelte components with single responsibility
- **Service Layer**: Centralized database operations and business logic
- **Mobile Optimization**: Mobile-first TailwindCSS, touch-friendly interfaces

## Data & Scale Considerations

### Current Data Volume
- **Players**: ~14 active team members
- **Matches**: 38 fixtures × 7 games = 266 games per season
- **Detailed Tracking**: Comprehensive dart-by-dart statistics
- **User Sessions**: Peak usage during weekly match nights

### Future Scale Planning
- **Teams**: 20 teams in full league adoption
- **Games**: 5,320+ league games per season across all teams
- **Users**: 280+ active users (14 per team × 20 teams)
- **Data Growth**: Exponential increase in dart tracking data

### Performance Considerations
- **Mobile Priority**: 70% mobile users require mobile-first architecture
- **Concurrent Usage**: Multiple teams playing simultaneously on match nights
- **Data Storage**: Efficient archiving strategy for historical seasons
- **Offline Capability**: Score recording without internet connection

## Feature Roadmap

### Phase 1: Core Restructure (Immediate)
1. **Foundation Layer**: TypeScript services, styled-components, shared UI
2. **Authentication**: Multi-team user hierarchy and permissions
3. **Scoring Engine**: Consolidate 3 systems into unified TypeScript solution
4. **Dashboard**: Mobile-first responsive design
5. **Integration**: Complete system assembly and testing

### Phase 2: Enhancement Features (Future)
- **Progressive Web App**: Home screen installation, offline capability
- **Notifications System**: Team selection reminders, match alerts
- **Advanced Statistics**: League tables, inter-team comparisons
- **Cup Competitions**: Tournament brackets for various cup formats

### Phase 3: League Expansion (2025/26 Season)
- **Multi-Team Deployment**: 20-team league rollout
- **Team Customization**: Individual branding and theme systems  
- **League Management**: Central administration and reporting
- **Performance Monitoring**: System health across all teams

## Success Criteria

### Technical Metrics
- [ ] **Bundle Size**: Reduced by 30%+ to improve mobile load times
- [ ] **Load Performance**: 40%+ faster initial page load
- [ ] **Code Quality**: 75%+ code reuse with single responsibility principles
- [ ] **Type Safety**: 100% TypeScript coverage for scalability

### Business Metrics
- [ ] **Zero Regression**: All existing functionality preserved
- [ ] **Mobile Experience**: Optimized for 70% mobile user base
- [ ] **Multi-Team Ready**: Architecture supports 20-team expansion
- [ ] **Maintainability**: Easy feature additions and modifications

### User Experience
- [ ] **Workflow Continuity**: No changes to existing user processes
- [ ] **Performance**: Noticeably faster load times and interactions
- [ ] **Mobile Optimization**: Touch-friendly interfaces throughout
- [ ] **Reliability**: Improved error handling and offline capability

## Risk Mitigation

### Technical Risks
- **Data Migration**: Careful preservation of all historical data
- **Regression Testing**: Comprehensive verification of existing functionality
- **Performance**: Mobile optimization without desktop compromise
- **Compatibility**: Cross-browser testing especially Safari (confirmed working)

### Business Risks  
- **User Adoption**: Maintain familiar workflows during transition
- **League Expansion**: Gradual rollout with pilot testing phase
- **Team Customization**: Balance flexibility with maintenance complexity
- **Data Privacy**: Multi-team data isolation and security

This restructure positions the Isaac Wilson Darts Team app as the foundation for a league-wide management system while dramatically improving the current user experience and technical architecture.