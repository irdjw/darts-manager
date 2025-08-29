# Project Setup Checklist - Darts App Restructure

## 📋 Step-by-Step Setup Guide

### 1. Create New Project
- [ ] Click "New Project" in Claude
- [ ] **Project Name**: "Darts App Restructure" 
- [ ] **Description**: "Full restructure of Isaac Wilson Darts Team app for TypeScript, mobile-first design, and multi-team scalability"

### 2. Upload Requirements Document
- [ ] Copy the complete requirements document from this conversation
- [ ] Create new file called `PROJECT_REQUIREMENTS.md`
- [ ] Paste the full requirements document
- [ ] Upload to project knowledge

### 3. Upload Current Codebase Files
Upload all files from your `src/` directory:

#### Core App Files
- [ ] `App.js`
- [ ] `App.css` 
- [ ] `index.js`
- [ ] `index.css`
- [ ] `supabaseClient.js`
- [ ] `setupTests.js`
- [ ] `reportWebVitals.js`

#### Component Files (src/components/)
- [ ] `Auth.js`
- [ ] `Dashboard.js`
- [ ] `Header.js`
- [ ] `MatchFlow.js`
- [ ] `TeamSelection.js`
- [ ] `FixtureManager.js`
- [ ] `PlayerManager.js`
- [ ] `WarmUpManager.js`
- [ ] `WarmUpSetup.js` (if exists)
- [ ] `WarmUpGames.js`
- [ ] `WarmUpResults.js` (if exists)
- [ ] `SeasonStatsDashboard.js`
- [ ] `DartsScorer.js`
- [ ] `DartByDartEntry.js`
- [ ] `CheckoutChecker.js`
- [ ] `GameScoring.js`

#### Database Schema
- [ ] Create file called `DATABASE_SCHEMA.sql`
- [ ] Copy the complete database schema (I can see it in project knowledge)
- [ ] Upload to project knowledge

#### Configuration Files (if they exist)
- [ ] `package.json`
- [ ] `tsconfig.json` (if exists)
- [ ] `.env.local` or `.env` (remove sensitive keys first!)
- [ ] `vercel.json` (if exists)

### 4. Create Project Context Document
Create a file called `PROJECT_CONTEXT.md` with:

```markdown
# Project Context

## Current Status
- **Live App**: Isaac Wilson Darts Team management system
- **Tech Stack**: React + JavaScript + Supabase + Vercel
- **Users**: ~14 team members, primarily mobile (70%)
- **Data**: 1 season of match/player data with dart-by-dart tracking

## Restructure Goals
- Migrate to TypeScript for multi-team scalability
- Mobile-first redesign (70% mobile users)
- Consolidate 3 scoring systems into 1
- Prepare for 20-team league expansion
- 33% bundle reduction, 44% faster load times

## Key Constraints
- No database schema changes
- Zero functional regression
- Maintain all existing user workflows
- Preserve all historical data

## Expansion Vision
- 20 teams in league (5,320 games/season)
- Team-specific theming and branding
- League-wide statistics and tables
- Cup competitions and friendlies support
```

### 5. Create Conversation Templates
Create a file called `CONVERSATION_STARTERS.md`:

```markdown
# Conversation Starter Templates

## Chat 1: Foundation Layer
"I'm ready to start the foundation layer restructure. Please build:
1. TypeScript database service layer
2. Mobile-first styled-components system  
3. Shared UI components (Card, Button, etc.)
4. Theme system for multi-team customization
5. Constants and configuration

Use the project requirements and current codebase as reference."

## Chat 2: Authentication System
"Ready for authentication restructure. Build the TypeScript auth system with:
1. AuthProvider with role hierarchy
2. ProtectedRoute components
3. Mobile-optimized LoginForm
4. Multi-team permission system

Reference the user hierarchy in project requirements."

## Chat 3: Scoring Engine
"Time to consolidate the scoring systems. Create unified TypeScript scoring engine:
1. Replace DartsScorer, DartByDartEntry, GameScoring
2. Mobile-first input design
3. Comprehensive checkout detection
4. Statistics calculation service

Maintain all current scoring functionality."

## Chat 4: Dashboard & Team Management  
"Ready for dashboard and team components:
1. Mobile-first dashboard layout
2. Optimized team selection logic
3. Match flow coordination
4. Multi-team ready components

Focus on mobile UX for 70% of users."

## Chat 5: Integration & Final Assembly
"Final integration phase:
1. New TypeScript App.js
2. Clean routing system
3. Performance optimizations  
4. Migration guide from old system

Complete the restructure with deployment readiness."
```

### 6. Upload Additional Context (Optional but Helpful)
If you have any of these, upload them too:
- [ ] Screenshots of current app interface
- [ ] Example data exports or reports  
- [ ] User feedback or pain points
- [ ] Performance metrics (bundle size, load times)
- [ ] Deployment configuration

### 7. Set Project Instructions
In the project settings, add these instructions:

```
This project contains the complete restructure of a darts team management app from JavaScript to TypeScript with mobile-first design.

CRITICAL CONTEXT:
- 70% mobile users - mobile-first design essential
- Multi-team scalability required (20 teams future)
- No database changes allowed
- Zero functional regression acceptable
- All historical data must be preserved

RESTRUCTURE PHASES:
1. Foundation (services, UI components, theme)
2. Authentication (multi-team user hierarchy) 
3. Scoring Engine (consolidate 3 systems)
4. Dashboard & Team Management
5. Integration & Deployment

Always reference PROJECT_REQUIREMENTS.md for complete specifications and business rules.
```

## ✅ Final Verification Checklist

Before starting first conversation:
- [ ] All current source files uploaded
- [ ] Requirements document uploaded
- [ ] Database schema documented
- [ ] Project context explained
- [ ] Conversation templates ready
- [ ] Project instructions set

## 🚀 Ready to Begin!

Once setup is complete, start your first conversation with the Chat 1 template. The foundation layer will include:
- Complete TypeScript database service
- Mobile-first styled-components
- Shared UI component library
- Multi-team theme system
- All constants and configuration

**Estimated setup time: 10-15 minutes**
**First conversation outcome: Production-ready foundation layer**