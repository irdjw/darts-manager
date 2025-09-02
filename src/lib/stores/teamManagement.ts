import { writable } from 'svelte/store';
import { DashboardService } from '$lib/services/dashboardService';
import type { Player, AttendanceRecord, TeamSelection } from '$lib/types/dashboard';

const dashboardService = new DashboardService();

export const allPlayers = writable<Player[]>([]);
export const weeklyAttendance = writable<AttendanceRecord[]>([]);
export const currentSelection = writable<TeamSelection | null>(null);
export const selectionWeek = writable<number>(1);

export const teamStore = {
  async loadPlayers() {
    const players = await dashboardService.getAllPlayers();
    allPlayers.set(players);
  },
  
  async loadAttendance(weekNumber: number) {
    const attendance = await dashboardService.getWeeklyAttendance(weekNumber);
    weeklyAttendance.set(attendance);
  },
  
  async generateTeamSelection(weekNumber: number): Promise<TeamSelection> {
    const players = await dashboardService.getAllPlayers();
    const attendance = await dashboardService.getWeeklyAttendance(weekNumber);
    
    // Captain can pick from ALL players who are in attendance (regardless of previous performance)
    const available = players.filter(p => {
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      return attendanceRecord?.available === true;
    });
    
    const unavailable = players.filter(p => {
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      return !attendanceRecord || attendanceRecord.available === false;
    });
    
    // No auto-selection - captain picks from all attendees
    const autoSelected: Player[] = [];
    
    const selection: TeamSelection = {
      week_number: weekNumber,
      selected_players: autoSelected,
      available_players: available,
      unavailable_players: unavailable,
      auto_selected: autoSelected,
      captain_picks: []
    };
    
    currentSelection.set(selection);
    return selection;
  }
};