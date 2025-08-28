import { writable, derived, type Readable } from 'svelte/stores';
import { dashboardService } from '$lib/services/dashboardService';

export const currentFixture = writable<Fixture | null>(null);
export const upcomingFixtures = writable<Fixture[]>([]);
export const dashboardStats = writable<DashboardStats | null>(null);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);

// Derived store for next match info
export const nextMatch: Readable<Fixture | null> = derived(
  [currentFixture, upcomingFixtures],
  ([current, upcoming]) => {
    if (current?.status === 'to_play') return current;
    return upcoming.find(f => f.status === 'to_play') || null;
  }
);

// Dashboard actions
export const dashboardStore = {
  async loadDashboard() {
    loading.set(true);
    error.set(null);
    
    try {
      const [fixture, upcoming, stats] = await Promise.all([
        dashboardService.getCurrentFixture(),
        dashboardService.getUpcomingFixtures(5),
        dashboardService.getSeasonStats()
      ]);
      
      currentFixture.set(fixture);
      upcomingFixtures.set(upcoming);
      dashboardStats.set(stats);
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      loading.set(false);
    }
  },
  
  clearError() {
    error.set(null);
  }
};