# Complete Mobile-First Dart Entry System Implementation

## Critical Context
My current dart-by-dart implementation is **not mobile-first** and lacks professional UI standards. I need a complete rebuild to match commercial darts app quality.

## Reference Design Standard
**Target Quality**: Professional darts app with:
- Full-screen mobile interface optimized for 5-6 inch screens
- Large, easily tappable number grid (minimum 60px touch targets)
- Clear visual hierarchy with prominent scores and statistics
- Single/Double/Treble/Bull/Outer quick selection buttons
- Real-time statistics display (3-dart average, darts thrown)
- Visual dart entry indicators (3 dart slots shown clearly)
- Professional dark theme with high contrast
- Immediate visual feedback on all interactions

## Current Implementation Issues
❌ **Tiny text input field** instead of number grid
❌ **Desktop-focused layout** not mobile-optimized
❌ **No visual dart indicators** for current turn
❌ **Missing quick-select buttons** (Single/Double/Treble/Bull)
❌ **Poor visual hierarchy** - scores not prominent enough
❌ **No real-time statistics** display
❌ **Inadequate touch targets** (<44px buttons)
❌ **Missing professional styling** and visual polish

## Requirements

### 1. Complete Mobile-First Dart Entry Interface
Create `src/lib/components/MobileDartEntry.svelte`:

**Layout Requirements:**
- **Full viewport height** mobile interface
- **Prominent score display** (large fonts, clear contrast)
- **3-dart visual indicators** showing current turn progress
- **Large number grid** (4x5 layout, 60px+ touch targets)
- **Quick action buttons**: Single/Double/Treble/Bull/Outer/Miss
- **Submit button** prominently positioned
- **Real-time statistics** in header area

**Visual Design:**
- **Dark theme** with high contrast text
- **Visual feedback** on button press (scale/color change)
- **Clear typography hierarchy** (scores largest, stats medium, controls small)
- **Rounded corners** and modern styling
- **Status indicators** for current thrower and leg progress

**Touch Interactions:**
- **Minimum 60px touch targets** for all interactive elements
- **Haptic feedback simulation** (visual scale effects)
- **Swipe gestures** for undo/clear
- **Long press** for special functions
- **Immediate response** (<100ms visual feedback)

### 2. Enhanced Scoring Engine Integration
Upgrade `src/lib/components/ScoringEngine.svelte`:

**Core Features:**
- **Best of 3/5 legs** support with visual leg indicators
- **Real-time checkout suggestions** when in finishing range
- **Automatic double-start/double-finish** validation
- **Bust detection** with clear visual feedback
- **Turn completion** with proper thrower switching
- **Live statistics calculation** (averages, high scores, etc.)

**Mobile Optimizations:**
- **Portrait orientation** optimized layout
- **Sticky statistics header** always visible
- **Collapsible sections** for detailed stats
- **One-handed operation** support

### 3. Professional Number Grid Component
Create `src/lib/components/NumberGrid.svelte`:

**Grid Layout:**
```
[1]  [2]  [3]  [4]  [5]
[6]  [7]  [8]  [9]  [10]
[11] [12] [13] [14] [15]
[16] [17] [18] [19] [20]
```

**Quick Actions Row:**
```
[Single] [Double] [Treble] [Bull] [Outer]
```

**Behaviour:**
- **Smart scoring**: Tap number + modifier (Single/Double/Treble)
- **Visual feedback**: Button press animations
- **Score validation**: Only allow valid dart combinations
- **Quick entry**: Common scores (0, 25, 50) easily accessible

### 4. Real-Time Statistics Component
Create `src/lib/components/LiveDartStats.svelte`:

**Statistics Display:**
- **3-dart average** (updating in real-time)
- **Darts thrown** current leg/game
- **High scores**: 100+, 140+, 180s count
- **Checkout percentage** when applicable
- **Leg progress**: Visual indicator of score remaining

**Visual Design:**
- **Compact horizontal layout** for mobile
- **Colour-coded performance** indicators
- **Animated transitions** when values change

### 5. Complete Database Integration
Create/Complete `src/lib/services/dartTrackingService.ts`:

**Core Operations:**
- **Save every dart throw** to `dart_tracking` table
- **Calculate running statistics** in real-time
- **Handle game state transitions** (turns, legs, games)
- **Manage checkout opportunities** and validation
- **Store complete game history** with timestamps

**Database Schema Integration:**
```sql
-- Use existing dart_tracking table:
INSERT INTO dart_tracking (
  league_game_id, player_id, dart_score, running_total,
  turn_number, dart_in_turn, leg_number, 
  is_double_attempt, is_checkout_attempt, checkout_successful
)
```

### 6. Mobile-First Visual Design System

**Colour Palette:**
- **Background**: Dark grey/black (#1a1a1a, #000000)
- **Primary**: Orange/red accents (#ff4444, #ff6b35)
- **Secondary**: Blue highlights (#4285f4)
- **Text**: High contrast white (#ffffff, #f5f5f5)
- **Success**: Green (#4caf50)
- **Warning**: Amber (#ffc107)

**Typography Scale:**
- **Scores**: 48px+ bold weight
- **Statistics**: 16px medium weight  
- **Labels**: 14px regular weight
- **Buttons**: 18px medium weight

**Component Spacing:**
- **Touch targets**: 60px minimum
- **Button padding**: 16px vertical, 24px horizontal
- **Section spacing**: 24px between major sections
- **Grid gaps**: 8px between number buttons

### 7. Advanced Mobile Features

**Gesture Support:**
- **Swipe left**: Undo last dart
- **Swipe right**: Clear current turn
- **Long press**: Access advanced options
- **Pull to refresh**: Reset current game

**Accessibility:**
- **Screen reader support** with proper ARIA labels
- **High contrast mode** support
- **Large text scaling** compatibility
- **Voice over** navigation support

**Performance:**
- **Smooth 60fps** animations
- **Instant touch response** (<100ms)
- **Efficient re-renders** using Svelte reactivity
- **Optimistic updates** for better perceived performance

## Implementation Priority

### Phase 1: Core Mobile Interface (Critical)
1. `MobileDartEntry.svelte` - Professional mobile interface
2. `NumberGrid.svelte` - Large touch-friendly number entry
3. `LiveDartStats.svelte` - Real-time statistics display

### Phase 2: Complete Backend Integration
4. `dartTrackingService.ts` - Complete database operations
5. Enhanced `ScoringEngine.svelte` - Full game flow
6. Updated `scoringStores.ts` - Reactive state management

### Phase 3: Polish and Advanced Features
7. Gesture support and animations
8. Accessibility improvements
9. Performance optimizations
10. Error handling and edge cases

## Technical Requirements

**SvelteKit Standards:**
- **TypeScript throughout** with proper interfaces
- **Reactive stores** for all state management
- **Component composition** with proper props/slots
- **Mobile-first TailwindCSS** utility classes

**Performance Targets:**
- **<100ms touch response** time
- **60fps animations** on interactions
- **<2MB total bundle** size
- **Works offline** with Svelte stores

**Browser Support:**
- **iOS Safari** 14+ (primary target)
- **Chrome Mobile** 90+ (secondary)
- **Samsung Internet** latest (tertiary)

## Expected Deliverables

**New Components:**
- `src/lib/components/MobileDartEntry.svelte`
- `src/lib/components/NumberGrid.svelte`
- `src/lib/components/LiveDartStats.svelte`
- `src/lib/components/DartVisualIndicators.svelte`
- `src/lib/components/CheckoutSuggestions.svelte`

**Enhanced Services:**
- `src/lib/services/dartTrackingService.ts` (complete implementation)
- `src/lib/services/statisticsService.ts` (real-time calculations)

**Updated Core:**
- `src/lib/components/ScoringEngine.svelte` (mobile-first rebuild)
- `src/lib/stores/scoringStores.ts` (enhanced reactivity)

## Success Criteria

**Visual Quality:**
✅ Matches or exceeds commercial darts app interfaces
✅ Passes mobile usability testing with actual users
✅ Professional dark theme with consistent styling
✅ All touch targets minimum 60px for easy tapping

**Functionality:**
✅ Every dart throw saves to database correctly
✅ Real-time statistics update as darts are entered
✅ Complete game flow from start to finish works
✅ Checkout suggestions appear when in finishing range

**Performance:**
✅ Smooth operation on 5-year-old mobile devices
✅ Instant visual feedback on all interactions
✅ Works reliably in poor network conditions
✅ No performance degradation during long games

**User Experience:**
✅ Intuitive for new users without training
✅ Efficient for experienced users (fast dart entry)
✅ Error-free operation under match pressure
✅ Professional appearance suitable for league use

Build a mobile dart entry system that your team will prefer over commercial apps.