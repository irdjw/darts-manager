<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated } from '$lib/stores/auth';
  import LoginForm from '$lib/components/LoginForm.svelte';

  // Redirect if already authenticated
  onMount(() => {
    if ($isAuthenticated) {
      const redirectTo = $page.url.searchParams.get('redirect') || '/dashboard';
      goto(redirectTo, { replaceState: true });
    }
  });

  function handleLoginSuccess() {
    const redirectTo = $page.url.searchParams.get('redirect') || '/dashboard';
    goto(redirectTo, { replaceState: true });
  }
</script>

<svelte:head>
  <title>Login - Isaac Wilson Darts</title>
</svelte:head>

{#if !$isAuthenticated}
  <LoginForm on:success={handleLoginSuccess} />
{/if}