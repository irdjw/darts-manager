// src/lib/utils/formatting.ts
import { format, parseISO, isValid } from 'date-fns';

/**
 * Format date string for display
 * @param dateString ISO date string or Date object
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      return 'Invalid Date';
    }
    
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date and time for display
 * @param dateString ISO date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      return 'Invalid Date';
    }
    
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid Date';
  }
}

/**
 * Format venue for display
 * @param venue 'home' or 'away'
 * @returns Formatted venue string with icon
 */
export function getVenueDisplay(venue: 'home' | 'away'): string {
  return venue === 'home' ? '🏠 Home' : '✈️ Away';
}

/**
 * Format venue for simple display
 * @param venue 'home' or 'away'
 * @returns Simple venue string
 */
export function getVenueText(venue: 'home' | 'away'): string {
  return venue === 'home' ? 'Home' : 'Away';
}

/**
 * Calculate win percentage
 * @param won Number of games won
 * @param total Total games played
 * @returns Win percentage as whole number
 */
export function calculateWinPercentage(won: number, total: number): number {
  return total > 0 ? Math.round((won / total) * 100) : 0;
}

/**
 * Format player name for display (handles first/last name splitting)
 * @param name Full name string
 * @returns Formatted name with initials if needed
 */
export function formatPlayerName(name: string, short?: boolean): string {
  if (!name || name.trim() === '') {
    return 'Unknown Player';
  }
  
  if (short && name.includes(' ')) {
    const parts = name.trim().split(' ');
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
  
  return name.trim();
}

/**
 * Format percentage for display
 * @param percentage Percentage as decimal (0.75) or whole number (75)
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number, decimals: number = 1): string {
  const percent = percentage > 1 ? percentage : percentage * 100;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Get result badge color classes for Tailwind
 * @param result 'win' | 'loss' | 'draw' | null
 * @returns Tailwind CSS classes
 */
export function getResultBadgeClasses(result: 'win' | 'loss' | 'draw' | null): string {
  switch (result) {
    case 'win':
      return 'bg-green-100 text-green-800';
    case 'loss':
      return 'bg-red-100 text-red-800';
    case 'draw':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get status badge color classes for Tailwind
 * @param status Status string
 * @returns Tailwind CSS classes
 */
export function getStatusBadgeClasses(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
    case 'in-progress':
      return 'bg-orange-100 text-orange-800';
    case 'to_play':
    case 'to-play':
    case 'upcoming':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Truncate text for mobile display
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 20): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}