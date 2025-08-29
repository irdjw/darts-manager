# Claude Project Instructions

## 🎯 Project Overview
Complete restructure of Isaac Wilson Darts Team management app from React to **SvelteKit + TypeScript** with mobile-first design and multi-team scalability.

## 🚨 CRITICAL CONTEXT

### Mobile-First Priority
- **70% mobile users, 20% tablet, 10% desktop**
- **ALL components must be mobile-first** with TailwindCSS responsive classes
- **Touch targets minimum 44px** (`min-h-[44px]` in TailwindCSS)
- **Performance is critical** - aim for <1.5s load times

### Technology Stack (CONFIRMED)
- **Frontend**: SvelteKit + TypeScript 
- **Styling**: TailwindCSS + CSS Variables (NOT styled-components)
- **State Management**: Svelte stores (NOT React Context)
- **Database**: Supabase (existing - NO schema changes allowed)
- **Deployment**: Netlify (NOT Vercel)

### Architecture Principles
- **Component-based**: Use Svelte components with proper composition
- **Mobile-first**: TailwindCSS with responsive breakpoints
- **TypeScript**: All new code must be TypeScript with proper interfaces
- **Performance**: Leverage SvelteKit's built-in optimizations

## 📋 BUSINESS CONSTRAINTS (CRITICAL)

### Absolute Requirements
- **Zero functional regression** - all existing workflows must be preserved exactly
- **No database changes** - work with current Supabase schema without modifications
- **Historical data preservation** - all player statistics and match history maintained
- **User experience continuity** - existing users notice no workflow changes

### Key Business Logic (Must Preserve)
- **Team Selection**: 7-player selection with auto-selection of previous winners
- **Drop System**: Players with 2+ consecutive losses sit out next week
- **Captain Override**: First week and special circumstance flexibility
- **Match Flow**: Attendance → Team Selection → Individual Games → Results
- **Statistics**: Win percentages, checkout stats, dart-by-dart records

## 🏗️ DEVELOPMENT PHASES

### Phase 1: Foundation Layer
- TypeScript database service layer (Supabase operations)
- Multi-team theme system (TailwindCSS + CSS variables)
- Shared Svelte components (Card, Button, Modal) 
- Svelte stores for state management
- Constants and configuration

### Phase 2: Authentication System
- Auth Svelte store (reactive authentication state)
- Protected routes with SvelteKit load functions
- Mobile-optimized login forms with TailwindCSS
- Multi-team permission system

### Phase 3: Scoring Engine Consolidation
- Replace 3 existing scoring systems with 1 Svelte system
- Mobile-first input interface with TailwindCSS
- Comprehensive checkout detection
- Statistics calculation with Svelte stores

### Phase 4: Dashboard & Team Management
- Mobile-first dashboard with SvelteKit routes
- Team selection logic with reactive updates
- Attendance tracking with Svelte stores
- Match flow coordination

### Phase 5: Integration & Deployment
- Complete SvelteKit app structure
- Netlify deployment optimization
- Performance testing and optimization
- Migration guide from React system

## 🎨 STYLING GUIDELINES

### TailwindCSS Patterns
```html
<!-- Mobile-first responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">

<!-- Touch-friendly buttons -->
<button class="bg-team-primary hover:opacity-90 text-white px-6 py-3 rounded-md min-h-[44px] font-medium transition-all">

<!-- Cards with proper spacing -->
<div class="bg-white p-4 md:p-6 rounded-lg shadow-lg mb-4">
```

### CSS Variables for Team Theming
```css
:root {
  --color-primary: #2c3e50;
  --color-secondary: #3498db;
}

:root[data-theme="team-2"] {
  --color-primary: #8b0000;
  --color-secondary: #ffd700;
}
```

## 📊 PERFORMANCE TARGETS

### Bundle Size Goals
- **Target**: 800KB total bundle (vs 2.1MB current React)
- **Method**: SvelteKit's superior compilation + tree shaking

### Load Time Goals  
- **Target**: 1.1s load time (vs 3.2s current)
- **Method**: Smaller bundles + SvelteKit SSR + mobile optimization

### Mobile Performance
- **Priority**: Smooth 60fps interactions on mobile
- **Method**: SvelteKit's minimal JavaScript + optimized CSS

## 🔍 QUALITY CHECKLIST

### Every Component Must Have:
- [ ] **TypeScript interfaces** for all props and data
- [ ] **Mobile-first TailwindCSS** classes
- [ ] **Touch-friendly interactions** (min 44px targets)
- [ ] **Responsive design** (mobile/tablet/desktop)
- [ ] **Proper error handling**

### Every Service Must Have:
- [ ] **TypeScript return types** clearly defined
- [ ] **Error handling** with try/catch blocks
- [ ] **Supabase operations** properly typed
- [ ] **No database schema changes**

## 🚀 SUCCESS CRITERIA

### Technical Metrics
- [ ] 62% bundle size reduction (to ~800KB)
- [ ] 65% load time improvement (to ~1.1s)
- [ ] 100% TypeScript coverage
- [ ] Zero functional regressions

### User Experience
- [ ] Mobile-optimized interface (70% of users)
- [ ] All existing workflows preserved
- [ ] Faster performance on all devices
- [ ] Multi-team theming ready

## ⚠️ COMMON PITFALLS TO AVOID

### SvelteKit Specific
- **Don't** use React patterns (useEffect, useState) - use Svelte reactivity
- **Don't** over-complicate stores - keep them simple and focused  
- **Don't** ignore SSR - leverage SvelteKit's server-side capabilities

### Mobile Design
- **Don't** use fixed px values - use responsive TailwindCSS classes
- **Don't** forget touch targets - minimum 44px for buttons/links
- **Don't** assume desktop - design mobile-first always

### Database Integration
- **Don't** change database schema - work with existing structure
- **Don't** break existing queries - maintain data compatibility
- **Don't** assume offline - plan for network issues

## 📚 REFERENCE DOCUMENTS

### Always Reference:
- **PROJECT_REQUIREMENTS.md** - Complete specifications
- **DATABASE_SCHEMA.sql** - Current database structure  
- **CONVERSATION_STARTERS.md** - Templates for each phase

### For Each Conversation:
1. **Read relevant requirements** for the current phase
2. **Check database schema** for data structure
3. **Verify mobile-first approach** in all components
4. **Ensure TypeScript** throughout
5. **Test responsive design** concepts

This project will become the template for 20-team league expansion - make it excellent! 🎯