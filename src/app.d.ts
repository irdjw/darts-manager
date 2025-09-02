import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { 
  UserRole, 
  Player, 
  Fixture, 
  Attendance, 
  LeagueGame,
  WarmupSession,
  ApiResponse,
  PaginatedResponse,
  AuthUser
} from '$lib/database/types';
import type { 
  DartThrow,
  TurnData,
  LegData,
  GameState,
  PlayerGameStats,
  CheckoutRoute,
  CheckoutData,
  ScoringMode,
  ScoringEngineProps
} from '$lib/types/scoring';
import type {
  DashboardStats,
  TeamSelection,
  AttendanceRecord
} from '$lib/types/dashboard';
import type { Permission } from '$lib/utils/permissions';

declare global {
  namespace App {
    interface Error {
      code?: string;
      message: string;
      details?: any;
    }

    interface Locals {
      supabase: SupabaseClient;
      user?: User;
    }

    interface PageData {
      session: import('@supabase/supabase-js').Session | null;
      user: User | null;
      players?: Player[];
      fixtures?: Fixture[];
      attendance?: AttendanceRecord[];
      dashboardStats?: DashboardStats;
    }

    interface Platform {
      env?: {
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
      };
    }
  }

  // Global type extensions for better TypeScript support
  namespace svelte.JSX {
    interface HTMLAttributes<T> {
      'on:click_outside'?: (event: CustomEvent) => void;
      'on:long_press'?: (event: CustomEvent) => void;
    }
  }
}

// Re-export commonly used types for easier imports
export type {
  // Database types
  Player,
  Fixture,
  Attendance,
  LeagueGame,
  UserRole,
  WarmupSession,
  AuthUser,
  
  // Scoring types  
  DartThrow,
  TurnData,
  LegData,
  GameState,
  PlayerGameStats,
  CheckoutRoute,
  CheckoutData,
  ScoringMode,
  ScoringEngineProps,
  
  // Dashboard types
  DashboardStats,
  TeamSelection,
  AttendanceRecord,
  
  // API types
  ApiResponse,
  PaginatedResponse,
  
  // Utility types
  Permission
};

// Global constants that might be needed
declare global {
  const APP_VERSION: string;
  const BUILD_TIME: string;
}

export {};