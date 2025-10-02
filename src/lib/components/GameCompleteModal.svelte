<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PlayerGameStats } from '$lib/types/scoring';

  export let winner: 'home' | 'away';
  export let homeStats: PlayerGameStats;
  export let awayStats: PlayerGameStats;
  export let homeLegsWon: number = 0;
  export let awayLegsWon: number = 0;

  const dispatch = createEventDispatcher();

  const winnerName = winner === 'home' ? homeStats.playerName : awayStats.playerName;
</script>

<div class="modal-overlay" on:click|self={() => dispatch('close')}>
  <div class="modal-content">
    <!-- Winner Announcement -->
    <div class="winner-section">
      <h2>🎯 Game Complete!</h2>
      <h3>{winnerName} Wins!</h3>
      <p class="final-score">{homeLegsWon} - {awayLegsWon}</p>
    </div>

    <!-- Statistics Grid -->
    <div class="stats-container">
      <!-- Home Player -->
      <div class="player-stats">
        <h4>{homeStats.playerName}</h4>
        <div class="stats-grid">
          <div class="stat">
            <span class="label">3-Dart Avg</span>
            <span class="value">{homeStats.average.toFixed(2)}</span>
          </div>
          <div class="stat">
            <span class="label">Total Darts</span>
            <span class="value">{homeStats.totalDarts}</span>
          </div>
          <div class="stat">
            <span class="label">180s</span>
            <span class="value">{homeStats.scores180}</span>
          </div>
          <div class="stat">
            <span class="label">140+</span>
            <span class="value">{homeStats.scores140Plus}</span>
          </div>
          <div class="stat">
            <span class="label">100+</span>
            <span class="value">{homeStats.scores100Plus}</span>
          </div>
          <div class="stat">
            <span class="label">Checkout %</span>
            <span class="value">{homeStats.checkoutPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Away Player -->
      <div class="player-stats">
        <h4>{awayStats.playerName}</h4>
        <div class="stats-grid">
          <div class="stat">
            <span class="label">3-Dart Avg</span>
            <span class="value">{awayStats.average.toFixed(2)}</span>
          </div>
          <div class="stat">
            <span class="label">Total Darts</span>
            <span class="value">{awayStats.totalDarts}</span>
          </div>
          <div class="stat">
            <span class="label">180s</span>
            <span class="value">{awayStats.scores180}</span>
          </div>
          <div class="stat">
            <span class="label">140+</span>
            <span class="value">{awayStats.scores140Plus}</span>
          </div>
          <div class="stat">
            <span class="label">100+</span>
            <span class="value">{awayStats.scores100Plus}</span>
          </div>
          <div class="stat">
            <span class="label">Checkout %</span>
            <span class="value">{awayStats.checkoutPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn-primary" on:click={() => dispatch('saveAndExit')}>
        Save & Exit
      </button>
      <button class="btn-secondary" on:click={() => dispatch('playAgain')}>
        Play Again
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }

  .modal-content {
    background: #1f2937;
    border-radius: 16px;
    padding: 24px;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    color: #f9fafb;
  }

  .winner-section {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 2px solid #374151;
  }

  .winner-section h2 {
    font-size: 28px;
    color: #f59e0b;
    margin-bottom: 8px;
  }

  .winner-section h3 {
    font-size: 24px;
    color: #10b981;
  }

  .final-score {
    font-size: 32px;
    font-weight: bold;
    margin-top: 8px;
  }

  .stats-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 24px;
  }

  .player-stats h4 {
    font-size: 20px;
    text-align: center;
    margin-bottom: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat {
    background: #374151;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat .label {
    font-size: 12px;
    color: #9ca3af;
  }

  .stat .value {
    font-size: 20px;
    font-weight: bold;
  }

  .divider {
    height: 2px;
    background: #374151;
  }

  .actions {
    display: flex;
    gap: 12px;
  }

  .actions button {
    flex: 1;
    padding: 16px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    min-height: 44px;
    touch-action: manipulation;
  }

  .btn-primary {
    background: #f59e0b;
    color: #000;
  }

  .btn-primary:active {
    background: #d97706;
  }

  .btn-secondary {
    background: #374151;
    color: #f9fafb;
  }

  .btn-secondary:active {
    background: #4b5563;
  }
</style>
