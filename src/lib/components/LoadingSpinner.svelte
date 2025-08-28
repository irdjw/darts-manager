<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let text: string = 'Loading...';
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };
</script>

<div class="flex flex-col items-center justify-center p-8">
  <div class="animate-spin rounded-full border-2 border-blue-500 border-t-transparent {sizeClasses[size]} mb-4"></div>
  <p class="text-gray-600 text-sm">{text}</p>
</div>
