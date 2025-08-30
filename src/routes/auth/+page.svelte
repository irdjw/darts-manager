<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { createSupabaseAuthHandler } from '$lib/utils/supabase-browser';
  
  let loading = false;
  let error: string | null = null;
  let email = '';
  let password = '';
  let authHandler: any = null;
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      authHandler = createSupabaseAuthHandler();
      if (!authHandler) {
        error = 'Authentication system not available';
        return;
      }
      
      // Check if user is already logged in
      const { session } = await authHandler.getSession();
      if (session) {
        goto('/dashboard');
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      error = 'Failed to initialize authentication';
    }
  });
  
  async function handleLogin() {
    if (!authHandler) {
      error = 'Authentication system not available';
      return;
    }
    
    if (!email || !password) {
      error = 'Please enter both email and password';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      const { data, error: authError } = await authHandler.signIn(email, password);
      
      if (authError) {
        error = authError.message;
      } else if (data?.user) {
        // Redirect to dashboard on successful login
        await goto('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      error = err instanceof Error ? err.message : 'Login failed';
    } finally {
      loading = false;
    }
  }
  
  async function handleDemoLogin(role: 'player' | 'captain' | 'admin' | 'super_admin') {
    if (!authHandler) {
      error = 'Authentication system not available';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      // For demo purposes, create a mock session
      // In a real app, you'd have demo accounts set up
      const demoCredentials = {
        player: { email: 'player@demo.com', password: 'demo123' },
        captain: { email: 'captain@demo.com', password: 'demo123' },
        admin: { email: 'admin@demo.com', password: 'demo123' },
        super_admin: { email: 'superadmin@demo.com', password: 'demo123' }
      };
      
      const { data, error: authError } = await authHandler.signIn(
        demoCredentials[role].email,
        demoCredentials[role].password
      );
      
      if (authError) {
        error = `Demo ${role} login failed: ${authError.message}`;
      } else if (data?.user) {
        await goto('/dashboard');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      error = `Demo login failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    } finally {
      loading = false;
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleLogin();
    }
  }
</script>

<svelte:head>
  <title>Sign In - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <!-- Logo/Header -->
    <div class="text-center">
      <div class="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
        <span class="text-white text-2xl font-bold">IW</span>
      </div>
      <h2 class="text-3xl font-bold text-gray-900">Isaac Wilson Darts Team</h2>
      <p class="mt-2 text-sm text-gray-600">Sign in to your account</p>
    </div>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <!-- Error Display -->
      {#if error}
        <div class="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <p class="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Login Form -->
      <form on:submit|preventDefault={handleLogin}>
        <div class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <div class="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                bind:value={email}
                on:keydown={handleKeydown}
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                       placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <div class="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                bind:value={password}
                on:keydown={handleKeydown}
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                       placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm 
                     text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none 
                     focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 
                     disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              {#if loading}
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              {:else}
                Sign in
              {/if}
            </button>
          </div>
        </div>
      </form>

      <!-- Demo Accounts -->
      <div class="mt-8">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Demo Accounts</span>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            on:click={() => handleDemoLogin('player')}
            class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md 
                   shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                   disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            Player Demo
          </button>

          <button
            type="button"
            disabled={loading}
            on:click={() => handleDemoLogin('captain')}
            class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md 
                   shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                   disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            Captain Demo
          </button>

          <button
            type="button"
            disabled={loading}
            on:click={() => handleDemoLogin('admin')}
            class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md 
                   shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                   disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            Admin Demo
          </button>

          <button
            type="button"
            disabled={loading}
            on:click={() => handleDemoLogin('super_admin')}
            class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md 
                   shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                   disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            Super Admin Demo
          </button>
        </div>
      </div>
    </div>
  </div>
</div>