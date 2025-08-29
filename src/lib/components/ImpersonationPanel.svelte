<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { ImpersonationManager, onImpersonationChange } from '$lib/utils/impersonation';
  import type { UserRole, ImpersonationState } from '$lib/utils/impersonation';
  
  const dispatch = createEventDispatcher();
  
  export let userRole: UserRole = 'player';
  export let visible = false;
  
  let impersonationState: ImpersonationState | null = null;
  let selectedRole: UserRole = 'player';
  let isImpersonating = false;
  
  const availableRoles: { role: UserRole; label: string; color: string }[] = [
    { role: 'player', label: 'Player', color: 'bg-gray-100 text-gray-800' },
    { role: 'captain', label: 'Captain', color: 'bg-blue-100 text-blue-800' },
    { role: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' }
  ];
  
  onMount(() => {
    // Load initial state
    impersonationState = ImpersonationManager.getImpersonationState();
    isImpersonating = ImpersonationManager.isImpersonating();
    
    // Listen for changes
    const cleanup = onImpersonationChange((state) => {
      impersonationState = state;
      isImpersonating = state?.isImpersonating ?? false;
      
      if (state) {
        dispatch('role-changed', { role: state.currentRole });
      } else {
        dispatch('role-changed', { role: userRole });
      }
    });
    
    return cleanup;
  });
  
  function startImpersonation() {
    try {
      ImpersonationManager.setImpersonation(userRole, selectedRole);
      
      // Refresh the page to apply new role
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Impersonation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to start impersonation');
    }
  }
  
  function stopImpersonation() {
    ImpersonationManager.clearImpersonation();
    
    // Refresh the page to restore original role
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      visible = false;
    }
  }
  
  function formatDuration(start: string): string {
    const startTime = new Date(start);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  }
</script>

{#if visible}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="impersonation-title"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
          <h2 id="impersonation-title" class="text-xl font-bold text-gray-900">
            View As User
          </h2>
        </div>
        
        <button
          on:click={() => visible = false}
          class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 
                 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Close impersonation panel"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        {#if isImpersonating && impersonationState}
          <!-- Currently Impersonating -->
          <div class="mb-6">
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div class="flex items-center mb-3">
                <svg class="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="font-medium text-orange-900">Currently Viewing As</h3>
              </div>
              
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-orange-800">Original Role:</span>
                  <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium capitalize">
                    {impersonationState.originalRole.replace('_', ' ')}
                  </span>
                </div>
                
                <div class="flex items-center justify-between">
                  <span class="text-sm text-orange-800">Viewing As:</span>
                  <span class="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium capitalize">
                    {impersonationState.currentRole.replace('_', ' ')}
                  </span>
                </div>
                
                <div class="flex items-center justify-between">
                  <span class="text-sm text-orange-800">Started:</span>
                  <span class="text-sm text-orange-600">
                    {formatDuration(impersonationState.impersonationStart)}
                  </span>
                </div>
              </div>
              
              <button
                on:click={stopImpersonation}
                class="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg 
                       font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Stop Impersonation
              </button>
            </div>
          </div>
        {:else}
          <!-- Start Impersonation -->
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-900 mb-3">Select Role to View As:</h3>
              <div class="space-y-2">
                {#each availableRoles as roleOption}
                  <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 
                               {selectedRole === roleOption.role ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}">
                    <input
                      type="radio"
                      bind:group={selectedRole}
                      value={roleOption.role}
                      class="sr-only"
                    />
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full border-2 mr-3 
                                   {selectedRole === roleOption.role ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}">
                        </div>
                        <span class="font-medium text-gray-900">{roleOption.label}</span>
                      </div>
                      <span class="px-2 py-1 rounded text-xs font-medium {roleOption.color}">
                        {roleOption.role}
                      </span>
                    </div>
                  </label>
                {/each}
              </div>
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="text-sm text-blue-800">
                  <p class="font-medium mb-1">Testing Mode</p>
                  <p>You'll see the application exactly as a user with the selected role would see it. All features will be restricted according to that role's permissions.</p>
                </div>
              </div>
            </div>
            
            <button
              on:click={startImpersonation}
              class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg 
                     font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Start Viewing as {availableRoles.find(r => r.role === selectedRole)?.label || selectedRole}
            </button>
          </div>
        {/if}
        
        <!-- Warning -->
        <div class="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div class="text-sm text-red-800">
              <p class="font-medium mb-1">Important</p>
              <p>Impersonation is for testing only. Any actions taken while impersonating will be attributed to your super admin account in audit logs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}