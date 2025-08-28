// Application constants and configuration
export const APP_CONFIG = {
  name: 'Isaac Wilson Darts Team',
  version: '2.0.0',
  description: 'Professional darts team management system',
  
  // Team configuration
  maxPlayersSelected: 7,
  consecutiveLossesForDrop: 2,
  
  // Performance targets
  targetBundleSize: 800, // KB
  targetLoadTime: 1100, // ms
  
  // Multi-team settings
  maxTeamsSupported: 20,
  defaultTheme: 'isaac-wilson',
  
  // Mobile optimization
  minTouchTarget: 44, // px
  mobileBreakpoint: 768, // px
  tabletBreakpoint: 1024 // px
} as const;

export const TEAM_THEMES = {
  'isaac-wilson': {
    name: 'Isaac Wilson Darts Team',
    primary: '#1e40af',
    secondary: '#10b981',
    accent: '#f59e0b'
  },
  'team-2': {
    name: 'Example Team 2',
    primary: '#dc2626',
    secondary: '#fbbf24',
    accent: '#8b5cf6'
  },
  'team-3': {
    name: 'Example Team 3',
    primary: '#059669',
    secondary: '#06b6d4',
    accent: '#f97316'
  }
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CAPTAIN: 'captain',
  PLAYER: 'player'
} as const;

export const GAME_RESULTS = {
  WIN: 'win',
  LOSS: 'loss',
  DRAW: 'draw'
} as const;

export const VENUES = {
  HOME: 'home',
  AWAY: 'away'
} as const;

// Responsive breakpoints (mobile-first)
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Performance monitoring
export const PERFORMANCE_BUDGETS = {
  bundleSize: 800000, // 800KB
  loadTime: 1100, // 1.1s
  firstContentfulPaint: 800, // 0.8s
  largestContentfulPaint: 1200 // 1.2s
} as const;