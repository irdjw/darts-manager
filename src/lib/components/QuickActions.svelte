<script lang="ts">
  export let userRole: string = 'player';

  function getActionsForRole(role: string) {
    const baseActions = [
      {
        title: 'Attendance',
        href: '/attendance',
        color: 'bg-green-600 hover:bg-green-700',
        description: 'Mark weekly availability'
      },
      {
        title: 'Statistics',
        href: '/statistics',
        color: 'bg-purple-600 hover:bg-purple-700',
        description: 'View performance data'
      },
      {
        title: 'Warm-up',
        href: '/warmup',
        color: 'bg-orange-600 hover:bg-orange-700',
        description: 'Practice tournament'
      }
    ];

    // Add captain-level actions for captain, admin, and super_admin
    if (['captain', 'admin', 'super_admin'].includes(role)) {
      baseActions.push(
        {
          title: 'Team Selection',
          href: '/team-selection',
          color: 'bg-blue-600 hover:bg-blue-700',
          description: 'Choose match team'
        },
        {
          title: 'Team Management',
          href: '/team',
          color: 'bg-indigo-600 hover:bg-indigo-700',
          description: 'Manage team performance'
        }
      );
    }

    // Add admin-level actions for admin and super_admin
    if (['admin', 'super_admin'].includes(role)) {
      baseActions.push({
        title: 'Admin Panel',
        href: '/admin',
        color: 'bg-red-600 hover:bg-red-700',
        description: 'System administration'
      });
    }

    return baseActions;
  }

  $: actions = getActionsForRole(userRole);
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {#each actions as action}
    <a
      href={action.href}
      class="{action.color} text-white p-4 rounded-lg shadow-lg 
             hover:shadow-xl transform hover:-translate-y-1 
             transition-all duration-200 min-h-[100px] 
             flex flex-col items-center justify-center space-y-2"
    >
      <span class="font-medium text-sm text-center">{action.title}</span>
      <span class="text-xs text-center opacity-75 hidden sm:block">{action.description}</span>
    </a>
  {/each}
</div>
