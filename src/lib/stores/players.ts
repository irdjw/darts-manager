import { writable, derived } from 'svelte/store';
import { PlayersService } from '../database/services/players.js';
import type { Player } from '../database/types.js';

interface PlayersState {
  players: Player[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

function createPlayersStore() {
  const { subscribe, set, update } = writable<PlayersState>({
    players: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  return {
    subscribe,
    
    // Load all players
    loadPlayers: async () => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const response = await PlayersService.getAll();
      
      if (response.error) {
        update(state => ({
          ...state,
          loading: false,
          error: response.error?.message || 'Failed to load players'
        }));
      } else {
        update(state => ({
          ...state,
          players: response.data || [],
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      }
    },

    // Get available players for team selection
    loadAvailablePlayers: async (weekNumber: number) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const response = await PlayersService.getAvailablePlayers(weekNumber);
      
      if (response.error) {
        update(state => ({
          ...state,
          loading: false,
          error: response.error?.message || 'Failed to load available players'
        }));
      } else {
        update(state => ({
          ...state,
          players: response.data || [],
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      }
    },

    // Update single player in store
    updatePlayer: (updatedPlayer: Player) => {
      update(state => ({
        ...state,
        players: state.players.map(p => 
          p.id === updatedPlayer.id ? updatedPlayer : p
        ),
        lastUpdated: new Date()
      }));
    },

    // Add new player to store
    addPlayer: (newPlayer: Player) => {
      update(state => ({
        ...state,
        players: [...state.players, newPlayer],
        lastUpdated: new Date()
      }));
    },

    // Clear error
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const players = createPlayersStore();

// Derived stores for specific data views
export const availablePlayers = derived(
  players, 
  $players => $players.players.filter(p => !p.drop_week)
);

export const topPerformers = derived(
  players,
  $players => $players.players
    .filter(p => p.games_played >= 5)
    .sort((a, b) => b.win_percentage - a.win_percentage)
    .slice(0, 5)
);

export const playersLoading = derived(players, $players => $players.loading);
export const playersError = derived(players, $players => $players.error);
