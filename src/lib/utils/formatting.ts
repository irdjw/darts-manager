// src/lib/utils/formatting.ts
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function getVenueDisplay(venue: 'home' | 'away'): string {
  return venue === 'home' ? 'Home' : 'Away';
}

export function calculateWinPercentage(won: number, total: number): number {
  return total > 0 ? Math.round((won / total) * 100) : 0;
}