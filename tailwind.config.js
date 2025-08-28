/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'team-primary': 'var(--color-primary)',
        'team-secondary': 'var(--color-secondary)',
        'team-accent': 'var(--color-accent)',
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}