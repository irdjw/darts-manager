<!-- PersonalGoalTracker.svelte - Goal setting and progress tracking -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { personalGameService } from '../services/personalGameService';
  import type { PersonalGoal } from '../database/types';

  // Props
  export let playerId: string;
  export let playerName: string = 'Personal Player';

  // State
  let goals: PersonalGoal[] = [];
  let loading: boolean = true;
  let showCreateGoal: boolean = false;
  let error: string | null = null;

  // New goal form state
  let newGoal = {
    goalType: 'average_improvement' as PersonalGoal['goal_type'],
    targetValue: 0,
    description: '',
    deadlineDate: ''
  };

  // Goal type configurations
  const goalTypeConfigs = {
    average_improvement: {
      label: 'Average Improvement',
      description: 'Improve your 3-dart average',
      unit: '',
      icon: '📈',
      suggestions: [30, 35, 40, 45, 50, 55, 60]
    },
    checkout_percentage: {
      label: 'Checkout Percentage',
      description: 'Improve your finishing percentage',
      unit: '%',
      icon: '🎯',
      suggestions: [25, 30, 35, 40, 50, 60]
    },
    consistency: {
      label: 'Consistency',
      description: 'Maintain consistent scoring',
      unit: '',
      icon: '📊',
      suggestions: [35, 40, 45, 50, 55]
    },
    '180_count': {
      label: '180 Count',
      description: 'Hit more maximum scores',
      unit: ' maximums',
      icon: '💯',
      suggestions: [5, 10, 15, 20, 25, 30]
    },
    custom: {
      label: 'Custom Goal',
      description: 'Set your own target',
      unit: '',
      icon: '🎯',
      suggestions: []
    }
  };

  onMount(async () => {
    await loadGoals();
  });

  async function loadGoals() {
    try {
      loading = true;
      error = null;
      goals = await personalGameService.getPersonalGoals(playerId);
    } catch (err: any) {
      console.error('Failed to load goals:', err);
      error = err.message || 'Failed to load goals';
    } finally {
      loading = false;
    }
  }

  async function createGoal() {
    try {
      if (!newGoal.description.trim()) {
        alert('Please enter a goal description');
        return;
      }

      if (newGoal.targetValue <= 0) {
        alert('Please enter a valid target value');
        return;
      }

      await personalGameService.createPersonalGoal(
        playerId,
        newGoal.goalType,
        newGoal.targetValue,
        newGoal.description,
        newGoal.deadlineDate || undefined
      );

      // Reset form and reload goals
      newGoal = {
        goalType: 'average_improvement',
        targetValue: 0,
        description: '',
        deadlineDate: ''
      };
      showCreateGoal = false;
      await loadGoals();

    } catch (err: any) {
      console.error('Failed to create goal:', err);
      alert('Failed to create goal: ' + err.message);
    }
  }

  function handleGoalTypeChange() {
    const config = goalTypeConfigs[newGoal.goalType];
    
    // Auto-generate description if empty
    if (!newGoal.description) {
      newGoal.description = `Reach ${newGoal.targetValue || '___'}${config.unit} ${config.description.toLowerCase()}`;
    }
    
    // Set suggested target value if none set
    if (newGoal.targetValue === 0 && config.suggestions.length > 0) {
      newGoal.targetValue = config.suggestions[0];
    }
  }

  function setSuggestedTarget(value: number) {
    newGoal.targetValue = value;
    
    // Update description with new value
    const config = goalTypeConfigs[newGoal.goalType];
    newGoal.description = `Reach ${value}${config.unit} ${config.description.toLowerCase()}`;
  }

  function getGoalProgress(goal: PersonalGoal): number {
    if (goal.target_value === 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  }

  function getProgressColor(progress: number): string {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function getGoalStatusText(goal: PersonalGoal): string {
    if (goal.achieved) return 'Achieved! 🎉';
    
    const progress = getGoalProgress(goal);
    if (progress >= 90) return 'Almost there! 🔥';
    if (progress >= 75) return 'Great progress! 💪';
    if (progress >= 50) return 'Making progress! 📈';
    if (progress >= 25) return 'Getting started! 🚀';
    return 'Just started! 💪';
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  function isOverdue(goal: PersonalGoal): boolean {
    if (!goal.deadline_date || goal.achieved) return false;
    return new Date(goal.deadline_date) < new Date();
  }

  function getDaysUntilDeadline(goal: PersonalGoal): number {
    if (!goal.deadline_date) return 0;
    const deadline = new Date(goal.deadline_date);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
</script>

<div class="min-h-screen bg-gray-900 text-white p-4">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-3xl font-bold text-orange-400 mb-2">
        🎯 Personal Goals
      </h1>
      <p class="text-gray-300">
        Set targets and track your improvement
      </p>
    </div>
    
    <button
      on:click={() => showCreateGoal = true}
      class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
      style="touch-action: manipulation;"
    >
      + New Goal
    </button>
  </div>

  {#if loading}
    <!-- Loading State -->
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p class="text-gray-400">Loading your goals...</p>
    </div>

  {:else if error}
    <!-- Error State -->
    <div class="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center">
      <p class="text-red-300 mb-4">❌ {error}</p>
      <button
        on:click={loadGoals}
        class="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition-all"
      >
        Try Again
      </button>
    </div>

  {:else}
    <!-- Goals List -->
    {#if goals.length === 0}
      <div class="text-center py-12">
        <div class="text-6xl mb-4">🎯</div>
        <h2 class="text-2xl font-bold text-gray-300 mb-3">No Goals Set Yet</h2>
        <p class="text-gray-400 mb-6">
          Setting goals helps you track your progress and stay motivated to improve your darts game.
        </p>
        <button
          on:click={() => showCreateGoal = true}
          class="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all"
        >
          Set Your First Goal
        </button>
      </div>
    {:else}
      <div class="space-y-4">
        {#each goals as goal}
          <div class="bg-gray-800 rounded-xl p-6 {goal.achieved ? 'border-2 border-green-500' : ''}">
            <!-- Goal Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-start gap-3">
                <div class="text-3xl">{goalTypeConfigs[goal.goal_type]?.icon || '🎯'}</div>
                <div>
                  <h3 class="font-bold text-lg text-white mb-1">
                    {goal.description}
                  </h3>
                  <div class="text-sm text-gray-400">
                    {goalTypeConfigs[goal.goal_type]?.label || goal.goal_type}
                  </div>
                </div>
              </div>

              <!-- Status Badge -->
              <div class="text-right">
                {#if goal.achieved}
                  <div class="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    ✅ Achieved
                  </div>
                  {#if goal.achieved_at}
                    <div class="text-xs text-gray-400 mt-1">
                      {formatDate(goal.achieved_at)}
                    </div>
                  {/if}
                {:else}
                  <div class="text-sm text-gray-300 font-medium">
                    {getGoalStatusText(goal)}
                  </div>
                {/if}
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-400">Progress</span>
                <span class="text-sm font-medium text-white">
                  {goal.current_value} / {goal.target_value} ({getGoalProgress(goal)}%)
                </span>
              </div>
              
              <div class="w-full bg-gray-700 rounded-full h-3">
                <div 
                  class="h-3 rounded-full transition-all duration-1000 ease-out {getProgressColor(getGoalProgress(goal))}"
                  style="width: {getGoalProgress(goal)}%"
                ></div>
              </div>
            </div>

            <!-- Deadline Information -->
            {#if goal.deadline_date}
              <div class="flex items-center gap-2 text-sm">
                <span class="text-gray-400">Deadline:</span>
                {#if isOverdue(goal)}
                  <span class="text-red-400 font-medium">
                    ⚠️ Overdue ({formatDate(goal.deadline_date)})
                  </span>
                {:else}
                  <span class="text-gray-300">
                    {formatDate(goal.deadline_date)}
                    {#if getDaysUntilDeadline(goal) <= 7}
                      <span class="text-yellow-400 ml-1">
                        ({getDaysUntilDeadline(goal)} days left)
                      </span>
                    {/if}
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Create Goal Modal -->
  {#if showCreateGoal}
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div class="bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-orange-400 mb-6">Create New Goal</h2>

        <!-- Goal Type Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-3">
            Goal Type
          </label>
          <div class="grid grid-cols-1 gap-2">
            {#each Object.entries(goalTypeConfigs) as [type, config]}
              <label class="flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                           {newGoal.goalType === type ? 'border-orange-500 bg-orange-500/10' : 'border-gray-600 hover:border-gray-500'}">
                <input
                  type="radio"
                  bind:group={newGoal.goalType}
                  value={type}
                  on:change={handleGoalTypeChange}
                  class="sr-only"
                />
                <div class="text-2xl mr-3">{config.icon}</div>
                <div class="flex-1">
                  <div class="font-medium text-white">{config.label}</div>
                  <div class="text-sm text-gray-400">{config.description}</div>
                </div>
              </label>
            {/each}
          </div>
        </div>

        <!-- Target Value -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Target Value
          </label>
          
          {#if goalTypeConfigs[newGoal.goalType].suggestions.length > 0}
            <div class="mb-3">
              <div class="text-xs text-gray-400 mb-2">Quick suggestions:</div>
              <div class="flex gap-2 flex-wrap">
                {#each goalTypeConfigs[newGoal.goalType].suggestions as suggestion}
                  <button
                    type="button"
                    on:click={() => setSuggestedTarget(suggestion)}
                    class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    {suggestion}{goalTypeConfigs[newGoal.goalType].unit}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <input
            type="number"
            bind:value={newGoal.targetValue}
            min="1"
            step="0.1"
            placeholder="Enter target value"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <!-- Description -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <input
            type="text"
            bind:value={newGoal.description}
            placeholder="Describe your goal"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <!-- Deadline (Optional) -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Deadline (Optional)
          </label>
          <input
            type="date"
            bind:value={newGoal.deadlineDate}
            min={new Date().toISOString().split('T')[0]}
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            on:click={() => showCreateGoal = false}
            class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-3 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            on:click={createGoal}
            class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #374151;
  }

  ::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 3px;
  }

  /* Prevent zoom on double tap */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Focus states */
  input:focus, button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }

  input:focus {
    outline: none;
  }
</style>