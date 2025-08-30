// User impersonation system for super admin testing

export type UserRole = 'player' | 'captain' | 'admin' | 'super_admin';

export interface ImpersonationState {
  isImpersonating: boolean;
  originalRole: UserRole;
  currentRole: UserRole;
  impersonationStart: string;
}

// Client-side impersonation management
class ImpersonationManager {
  private static STORAGE_KEY = 'impersonation-state';
  
  static setImpersonation(originalRole: UserRole, targetRole: UserRole): void {
    if (originalRole !== 'super_admin') {
      throw new Error('Only super admins can impersonate other users');
    }
    
    const state: ImpersonationState = {
      isImpersonating: true,
      originalRole,
      currentRole: targetRole,
      impersonationStart: new Date().toISOString()
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    
    // Set cookie for server-side access
    document.cookie = `impersonating-role=${targetRole}; path=/; max-age=3600`; // 1 hour max
    
    // Dispatch event for reactive components
    window.dispatchEvent(new CustomEvent('impersonation-changed', {
      detail: state
    }));
  }
  
  static clearImpersonation(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    
    // Clear cookie
    document.cookie = 'impersonating-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('impersonation-changed', {
      detail: null
    }));
  }
  
  static getImpersonationState(): ImpersonationState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  static isImpersonating(): boolean {
    const state = this.getImpersonationState();
    return state?.isImpersonating ?? false;
  }
  
  static getCurrentRole(): UserRole | null {
    const state = this.getImpersonationState();
    return state?.currentRole ?? null;
  }
  
  static getOriginalRole(): UserRole | null {
    const state = this.getImpersonationState();
    return state?.originalRole ?? null;
  }
}

// Server-side helpers
export function getEffectiveUserRole(
  sessionRole: UserRole,
  impersonatingRole?: string
): UserRole {
  // Only super admins can impersonate
  if (sessionRole === 'super_admin' && impersonatingRole) {
    const targetRole = impersonatingRole as UserRole;
    if (['player', 'captain', 'admin', 'super_admin'].includes(targetRole)) {
      return targetRole;
    }
  }
  
  return sessionRole;
}

export function validateImpersonation(
  sessionRole: UserRole,
  targetRole: UserRole
): boolean {
  // Only super admins can impersonate
  if (sessionRole !== 'super_admin') {
    return false;
  }
  
  // Can impersonate any role except super_admin
  return ['player', 'captain', 'admin'].includes(targetRole);
}

// React to impersonation changes
export function onImpersonationChange(
  callback: (state: ImpersonationState | null) => void
): () => void {
  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail);
  };
  
  window.addEventListener('impersonation-changed', handleChange as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('impersonation-changed', handleChange as EventListener);
  };
}

export { ImpersonationManager };