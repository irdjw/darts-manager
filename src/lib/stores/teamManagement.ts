xport const allPlayers = writable<Player[]>([]);
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
    
    // Business logic for team selection
    const available = players.filter(p => {
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      return attendanceRecord?.attended && (!p.drop_week || p.drop_week !== weekNumber);
    });
    
    const unavailable = players.filter(p => !available.includes(p));
    
    // Auto-select previous winners (if week > 1)
    let autoSelected: Player[] = [];
    if (weekNumber > 1) {
      autoSelected = available.filter(p => p.last_result === 'win').slice(0, 7);
    }
    
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