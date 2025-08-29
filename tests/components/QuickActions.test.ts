import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QuickActions from '$lib/components/QuickActions.svelte';

describe('QuickActions', () => {
  it('renders base actions for player role', () => {
    render(QuickActions, { userRole: 'player' });
    
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    
    // Should not show captain-only actions
    expect(screen.queryByText('Team Selection')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Management')).not.toBeInTheDocument();
  });

  it('renders captain actions for captain role', () => {
    render(QuickActions, { userRole: 'captain' });
    
    // Base actions
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    
    // Captain actions
    expect(screen.getByText('Team Selection')).toBeInTheDocument();
    expect(screen.getByText('Team Management')).toBeInTheDocument();
    
    // Should not show admin-only actions
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('renders admin actions for admin role', () => {
    render(QuickActions, { userRole: 'admin' });
    
    // Should include all actions
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Team Selection')).toBeInTheDocument();
    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders admin actions for super_admin role', () => {
    render(QuickActions, { userRole: 'super_admin' });
    
    // Should include all actions
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Team Selection')).toBeInTheDocument();
    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    render(QuickActions, { userRole: 'admin' });
    
    const attendanceLink = screen.getByRole('link', { name: /attendance/i });
    expect(attendanceLink).toHaveAttribute('href', '/attendance');
    
    const statisticsLink = screen.getByRole('link', { name: /statistics/i });
    expect(statisticsLink).toHaveAttribute('href', '/statistics');
    
    const warmupLink = screen.getByRole('link', { name: /warm-up/i });
    expect(warmupLink).toHaveAttribute('href', '/warmup');
  });

  it('defaults to player role when no role provided', () => {
    render(QuickActions);
    
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.queryByText('Team Selection')).not.toBeInTheDocument();
  });
});