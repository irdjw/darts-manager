import type { Snippet } from 'svelte';
import type { Player, Fixture } from '$lib/database/types';

export interface BaseComponentProps {
  class?: string;
  id?: string;
}

export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: string;
  subtitle?: string;
  children: Snippet;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: Snippet;
}

export interface PlayerCardProps extends BaseComponentProps {
  player: Player;
  showStats?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (player: Player) => void;
}

export interface FixtureCardProps extends BaseComponentProps {
  fixture: Fixture;
  showDetails?: boolean;
  editable?: boolean;
  onEdit?: (fixture: Fixture) => void;
}

export interface ModalProps extends BaseComponentProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  onClose?: () => void;
  children: Snippet;
}