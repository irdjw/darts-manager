<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth, authError } from '../stores/auth';
  
  const dispatch = createEventDispatcher();

  let email = '';
  let password = '';
  let loading = false;
  let showPassword = false;
  
  // Clear any previous errors on mount
  onMount(() => {
    auth.clearError();
  });

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      return;
    }

    loading = true;
    const result = await auth.signIn(email, password);
    loading = false;

    if (result.success) {
      dispatch('success');
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
  <div class="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="text-4xl mb-4">🎯</div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Isaac Wilson Darts</h1>
      <p class="text-gray-600">Team Management System</p>
    </div>

    <!-- Error Message -->
    {#if $authError}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex items-center">
          <div class="text-red-400 mr-3">⚠️</div>
          <p class="text-sm text-red-800">{$authError}</p>
        </div>
      </div>
    {/if}

    <!-- Login Form -->
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          bind:value={email}
          on:keypress={handleKeyPress}
          required
          autocomplete="email"
          class="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm 
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                 text-base transition-all"
          placeholder="Enter your email"
          disabled={loading}
        />
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <div class="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            bind:value={password}
            on:keypress={handleKeyPress}
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 pr-12 min-h-[44px] border border-gray-300 rounded-md shadow-sm 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   text-base transition-all"
            placeholder="Enter your password"
            disabled={loading}
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 
                   text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] 
                   flex items-center justify-center"
            on:click={() => showPassword = !showPassword}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={loading || !email.trim() || !password.trim()}
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
               text-white font-medium py-3 px-4 rounded-md min-h-[44px]
               transition-all duration-200 transform active:scale-95
               focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {#if loading}
          <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
            Signing In...
          </div>
        {:else}
          Sign In
        {/if}
      </button>
    </form>

    <!-- Footer -->
    <div class="mt-8 text-center">
      <p class="text-xs text-gray-500">
        Having trouble? Contact your team administrator
      </p>
    </div>
  </div>
</div>