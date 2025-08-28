/ src/lib/components/MatchCard.svelte
<script lang="ts">
  import type { Fixture } from '$lib/types/dashboard';
  import { formatDate, getVenueDisplay } from '$lib/utils/formatting';
  
  export let fixture: Fixture;
  export let priority: boolean = false;
  
  $: statusColor = {
    'completed': fixture.team_won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
    'to_play': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-orange-100 text-orange-800'
  }[fixture.status];
  
  $: resultDisplay = fixture.status === 'completed' 
    ? fixture.team_won ? 'Won' : 'Lost'
    : fixture.status === 'to_play' ? 'Upcoming' : 'In Progress';
</script>

<div class="card bg-white p-4 md:p-6 rounded-lg shadow-lg {priority ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <!-- Match Info -->
    <div class="flex-1">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-900">Week {fixture.week_number}</h3>
        <span class="px-2 py-1 rounded-full text-xs font-medium {statusColor}">
          {resultDisplay}
        </span>
      </div>
      
      <div class="space-y-1">
        <p class="text-gray-700 font-medium">vs {fixture.opposition}</p>
        <div class="flex items-center space-x-4 text-sm text-gray-500">
          <span class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(fixture.match_date)}</span>
          </span>
          
          <span class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{getVenueDisplay(fixture.venue)}</span>
          </span>
        </div>
      </div>
    </div>
    
    <!-- Action Button -->
    {#if fixture.status === 'to_play'}
      <div class="flex space-x-2">
        <a
          href="/team-selection/{fixture.week_number}"
          class="btn-primary px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] 
                 flex items-center justify-center transition-all touch-manipulation"
        >
          Select Team
        </a>
      </div>
    {:else if fixture.status === 'in_progress'}
      <div class="flex space-x-2">
        <a
          href="/scoring/{fixture.id}"
          class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium 
                 min-h-[44px] flex items-center justify-center transition-all touch-manipulation"
        >
          Record Games
        </a>
      </div>
    {/if}
  </div>
</div>