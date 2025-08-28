<script lang="ts">
  export let message: string = 'Loading...';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  
  $: sizeClasses = {
    'sm': 'w-4 h-4',
    'md': 'w-8 h-8', 
    'lg': 'w-12 h-12'
  }[size];
</script>

<div class="flex flex-col items-center justify-center py-8 space-y-4">
  <div class="animate-spin rounded-full border-2 border-blue-500 border-t-transparent {sizeClasses}"></div>
  <p class="text-gray-600 text-sm">{message}</p>
</div>