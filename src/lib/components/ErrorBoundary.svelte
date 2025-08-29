<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  
  const dispatch = createEventDispatcher();
  
  export let fallback: string | null = null;
  export let retryable = true;
  export let showDetails = false;
  
  let error: Error | null = null;
  let errorInfo: string = '';
  let hasError = false;
  let retryCount = 0;
  let maxRetries = 3;
  
  onMount(() => {
    // Catch unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      setError(event.error, 'Unhandled JavaScript error');
    };
    
    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(
        event.reason instanceof Error ? event.reason : new Error(event.reason),
        'Unhandled promise rejection'
      );
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  });
  
  function setError(err: Error, info: string = '') {
    error = err;
    errorInfo = info;
    hasError = true;
    
    // Log to console
    console.error('Error Boundary caught error:', {
      error: err,
      errorInfo: info,
      stack: err.stack,
      retryCount
    });
    
    // Dispatch error event for parent components
    dispatch('error', { error: err, errorInfo: info });
    
    // Send to error reporting service (mock)
    reportError(err, info);
  }
  
  function reportError(err: Error, info: string) {
    // In a real app, send to error reporting service like Sentry
    console.log('Error reported to monitoring service:', {
      message: err.message,
      stack: err.stack,
      info,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }
  
  function retry() {
    if (retryCount < maxRetries) {
      retryCount++;
      hasError = false;
      error = null;
      errorInfo = '';
      
      // Force component re-render
      window.location.reload();
    }
  }
  
  function reset() {
    hasError = false;
    error = null;
    errorInfo = '';
    retryCount = 0;
  }
  
  function goHome() {
    reset();
    goto('/dashboard');
  }
  
  function toggleDetails() {
    showDetails = !showDetails;
  }
  
  // Export functions for parent component use
  export { setError, reset };
</script>

{#if hasError && error}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-lg w-full">
      <!-- Error Icon -->
      <div class="text-center mb-8">
        <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p class="text-gray-600 mb-6">
          We've encountered an unexpected error. Our team has been notified.
        </p>
      </div>

      <!-- Error Details Card -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Error Details</h2>
          <button
            on:click={toggleDetails}
            class="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
          >
            <svg 
              class="w-5 h-5 transform transition-transform {showDetails ? 'rotate-180' : ''}" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-700">Error:</span>
            <p class="text-sm text-red-600 mt-1">{error.message}</p>
          </div>
          
          {#if errorInfo}
            <div>
              <span class="text-sm font-medium text-gray-700">Context:</span>
              <p class="text-sm text-gray-600 mt-1">{errorInfo}</p>
            </div>
          {/if}
          
          <div>
            <span class="text-sm font-medium text-gray-700">Time:</span>
            <p class="text-sm text-gray-600 mt-1">{new Date().toLocaleString()}</p>
          </div>
          
          {#if showDetails && error.stack}
            <div>
              <span class="text-sm font-medium text-gray-700">Stack Trace:</span>
              <pre class="text-xs text-gray-600 mt-1 p-3 bg-gray-50 rounded border overflow-auto max-h-40">{error.stack}</pre>
            </div>
          {/if}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3">
        {#if retryable && retryCount < maxRetries}
          <button
            on:click={retry}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium 
                   min-h-[44px] transition-all touch-manipulation"
          >
            Try Again {retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}
          </button>
        {/if}
        
        <button
          on:click={goHome}
          class="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium 
                 min-h-[44px] transition-all touch-manipulation"
        >
          Go to Dashboard
        </button>
        
        <button
          on:click={() => window.location.reload()}
          class="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium 
                 min-h-[44px] transition-all touch-manipulation"
        >
          Reload Page
        </button>
      </div>

      <!-- Help Section -->
      <div class="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 class="font-medium text-blue-900 mb-2">Need Help?</h3>
        <div class="text-sm text-blue-800 space-y-1">
          <p>• Check your internet connection</p>
          <p>• Clear your browser cache</p>
          <p>• Contact the team captain if the problem persists</p>
        </div>
      </div>

      <!-- Technical Info -->
      <div class="mt-4 text-center">
        <p class="text-xs text-gray-500">
          Error ID: {error.name}-{Date.now().toString(36)}
        </p>
      </div>
    </div>
  </div>
{:else if fallback}
  <div class="error-fallback">
    {fallback}
  </div>
{:else}
  <slot />
{/if}