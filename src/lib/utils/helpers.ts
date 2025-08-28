import type { Player } from '../database/types.js';

// Format percentage with proper rounding
export function formatPercentage(value: number, decimals = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

// Format player statistics
export function formatPlayerStats(player: Player) {
  return {
    winPercentage: formatPercentage(player.win_percentage),
    checkoutPercentage: player.checkout_attempts > 0 
      ? formatPercentage((player.checkout_hits / player.checkout_attempts) * 100)
      : '0.0%',
    averageDarts: player.games_played > 0 
      ? Math.round(player.total_darts / player.games_played)
      : 0,
    score180sPerGame: player.games_played > 0 
      ? (player.total_180s / player.games_played).toFixed(1)
      : '0.0'
  };
}

// Determine player availability for team selection
export function isPlayerAvailable(player: Player, weekNumber: number): boolean {
  return !player.drop_week || player.drop_week !== weekNumber;
}

// Get player status for display
export function getPlayerStatus(player: Player, weekNumber: number): 'available' | 'dropped' | 'form_concern' {
  if (!isPlayerAvailable(player, weekNumber)) return 'dropped';
  if (player.consecutive_losses >= 1) return 'form_concern';
  return 'available';
}

// Sort players for team selection (winners first, then by form)
export function sortPlayersForSelection(players: Player[]): Player[] {
  return players.sort((a, b) => {
    // Winners from last week first
    if (a.last_result === 'win' && b.last_result !== 'win') return -1;
    if (b.last_result === 'win' && a.last_result !== 'win') return 1;
    
    // Then by win percentage
    if (a.win_percentage !== b.win_percentage) {
      return b.win_percentage - a.win_percentage;
    }
    
    // Finally by name
    return a.name.localeCompare(b.name);
  });
}

// Debounce function for search/input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Mobile detection
export function isMobile(): boolean {
  return window.innerWidth <= 768;
}

// Touch device detection
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Format date for display
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'long') {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return d.toLocaleDateString('en-GB');
}

// Calculate team selection recommendations
export interface TeamSelectionRecommendation {
  autoSelected: Player[];
  recommended: Player[];
  available: Player[];
  warnings: string[];
}

export function getTeamSelectionRecommendations(
  players: Player[],
  weekNumber: number
): TeamSelectionRecommendation {
  const availablePlayers = players.filter(p => isPlayerAvailable(p, weekNumber));
  const sortedPlayers = sortPlayersForSelection(availablePlayers);
  
  // Auto-select winners from previous week
  const autoSelected = sortedPlayers.filter(p => p.last_result === 'win').slice(0, 7);
  
  // Recommend remaining slots based on form
  const remaining = 7 - autoSelected.length;
  const recommended = sortedPlayers
    .filter(p => p.last_result !== 'win')
    .slice(0, remaining);
  
  const warnings = [];
  
  // Check for form concerns
  const formConcerns = recommended.filter(p => p.consecutive_losses >= 1);
  if (formConcerns.length > 0) {
    warnings.push(`${formConcerns.length} player(s) on losing streak: ${formConcerns.map(p => p.name).join(', ')}`);
  }
  
  // Check if not enough players
  if (availablePlayers.length < 7) {
    warnings.push(`Only ${availablePlayers.length} players available (need 7)`);
  }
  
  return {
    autoSelected,
    recommended,
    available: sortedPlayers,
    warnings
  };
}

// Theme utilities
export function setTheme(themeName: string): void {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('darts-theme', themeName);
}

export function getStoredTheme(): string | null {
  return localStorage.getItem('darts-theme');
}

export function initializeTheme(): void {
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    setTheme(storedTheme);
  }
}