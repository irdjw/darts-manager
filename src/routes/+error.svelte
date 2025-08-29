<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Get error details from the page store
  $: error = $page.error;
  $: status = $page.status || 500;

  function getErrorMessage(status: number): { title: string; message: string; icon: string } {
    switch (status) {
      case 404:
        return {
          title: 'Page Not Found',
          message: 'The page you\'re looking for doesn\'t exist or has been moved.',
          icon: '🎯'
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to access this page.',
          icon: '🚫'
        };
      case 500:
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. Please try again later.',
          icon: '⚠️'
        };
      default:
        return {
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred. Please try again.',
          icon: '❌'
        };
    }
  }

  $: errorInfo = getErrorMessage(status);

  function handleGoHome() {
    goto('/dashboard');
  }

  function handleGoBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/dashboard');
    }
  }

  function handleRefresh() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
</script>

<svelte:head>
  <title>Error {status} - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Isaac Wilson Darts Team</h1>
        <p class="text-sm text-gray-500">Error {status}</p>
      </div>
    </div>
  </header>

  <!-- Main error content -->
  <main class="flex-1 flex items-center justify-center px-4 py-12 md:px-6">
    <div class="max-w-md w-full text-center">
      <!-- Error Icon -->
      <div class="text-8xl mb-6">
        {errorInfo.icon}
      </div>

      <!-- Error Details -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {errorInfo.title}
        </h1>
        <p class="text-gray-600 text-lg mb-2">
          {errorInfo.message}
        </p>
        
        {#if status === 404}
          <p class="text-sm text-gray-500 mb-4">
            The URL might be misspelled or the content has been removed.
          </p>
        {:else if status === 500}
          <p class="text-sm text-gray-500 mb-4">
            Our team has been notified and is working on a fix.
          </p>
        {/if}

        {#if error && error.message && status !== 404}
          <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">
              <strong>Technical details:</strong> {error.message}
            </p>
          </div>
        {/if}
      </div>

      <!-- Action Buttons -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            on:click={handleGoHome}
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium
                   min-h-[44px] transition-all touch-manipulation flex-1"
          >
            🏠 Go Home
          </button>
          
          <button
            on:click={handleGoBack}
            class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium
                   min-h-[44px] transition-all touch-manipulation flex-1"
          >
            ← Go Back
          </button>
        </div>
        
        {#if status >= 500}
          <button
            on:click={handleRefresh}
            class="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium
                   min-h-[44px] transition-all touch-manipulation"
          >
            🔄 Try Again
          </button>
        {/if}
      </div>

      <!-- Help Section -->
      <div class="mt-12 pt-8 border-t border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
        <div class="space-y-3 text-sm text-gray-600">
          <div>
            <a 
              href="/dashboard" 
              class="text-blue-600 hover:text-blue-700 font-medium"
            >
              📊 View Dashboard
            </a> - Return to the main dashboard
          </div>
          <div>
            <a 
              href="/statistics" 
              class="text-blue-600 hover:text-blue-700 font-medium"
            >
              📈 Team Statistics
            </a> - Check player performance
          </div>
          <div>
            <a 
              href="/warmup" 
              class="text-blue-600 hover:text-blue-700 font-medium"
            >
              🎯 Practice Tournament
            </a> - Start a warmup session
          </div>
          {#if status === 404}
            <div class="mt-4 pt-4 border-t border-gray-100">
              <p class="text-xs text-gray-500">
                If you think this page should exist, please contact the team captain.
              </p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-gray-200 px-4 py-6 md:px-6">
    <div class="text-center">
      <p class="text-sm text-gray-500">
        Isaac Wilson Darts Team Management System
      </p>
      <p class="text-xs text-gray-400 mt-1">
        Error occurred at {new Date().toLocaleString()}
      </p>
    </div>
  </footer>
</div>